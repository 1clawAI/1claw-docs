#!/usr/bin/env node
/**
 * Build-time generators for LLM discoverability:
 * - static/llms-full.txt — full concatenated doc corpus
 * - static/llms.txt index section — categorized URL index (between markers)
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "docs");
const OUT_FULL = path.join(__dirname, "..", "static", "llms-full.txt");
const OUT_LLMS = path.join(__dirname, "..", "static", "llms.txt");
const SITE_URL = "https://docs.1claw.xyz";
const INDEX_START = "<!-- AUTO-GENERATED-DOC-INDEX:START -->";
const INDEX_END = "<!-- AUTO-GENERATED-DOC-INDEX:END -->";

const CATEGORIES = [
    { prefix: "intro", label: "Introduction" },
    { prefix: "quickstart/", label: "Quickstart" },
    { prefix: "concepts/", label: "Concepts" },
    { prefix: "guides/", label: "Guides" },
    { prefix: "human-api/", label: "Human API (Vault)" },
    { prefix: "agent-api/", label: "Agent API" },
    { prefix: "mcp/", label: "MCP Server" },
    { prefix: "sdks/", label: "SDKs" },
    { prefix: "security/", label: "Security" },
    { prefix: "reference/", label: "Reference" },
    { prefix: "integrations/", label: "Integrations" },
];

function getAllMdFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) getAllMdFiles(full, files);
        else if (e.name.endsWith(".md")) files.push(full);
    }
    return files;
}

function parseTitle(content, rel) {
    const fm = content.match(/^title:\s*["']?([^"'\n]+)/m);
    if (fm) return fm[1].trim();
    const h1 = content.match(/^#\s+(.+)$/m);
    if (h1) return h1[1].trim();
    return rel.replace(/\.md$/, "").replace(/\//g, " / ");
}

function slugFromRel(rel) {
    const slug = rel.replace(/\.md$/, "");
    if (slug === "intro") return "/docs/intro";
    if (slug === "quickstart/index") return "/docs/quickstart";
    return `/docs/${slug}`;
}

function categorize(rel) {
    for (const cat of CATEGORIES) {
        if (cat.prefix.endsWith("/")) {
            if (rel.startsWith(cat.prefix)) return cat.label;
        } else if (rel === cat.prefix || rel.startsWith(`${cat.prefix}.`)) {
            return cat.label;
        }
    }
    return "Other";
}

function buildFullTxt(mdFiles) {
    const parts = [];
    for (const file of mdFiles) {
        const rel = path.relative(DOCS_DIR, file);
        const content = fs.readFileSync(file, "utf8");
        parts.push(`## ${parseTitle(content, rel)}\n\n${content}`);
    }
    return parts.join("\n\n---\n\n");
}

function buildIndex(mdFiles) {
    const byCategory = {};
    for (const file of mdFiles) {
        const rel = path.relative(DOCS_DIR, file);
        const content = fs.readFileSync(file, "utf8");
        const title = parseTitle(content, rel);
        const url = `${SITE_URL}${slugFromRel(rel)}`;
        const cat = categorize(rel);
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({ title, url, rel });
    }

    const lines = [
        "## Documentation index",
        "",
        `Complete index of ${mdFiles.length} doc pages on docs.1claw.xyz. Full content: ${SITE_URL}/llms-full.txt`,
        "",
    ];

    for (const cat of CATEGORIES) {
        const entries = byCategory[cat.label];
        if (!entries?.length) continue;
        lines.push(`### ${cat.label} (${entries.length})`);
        lines.push("");
        for (const e of entries.sort((a, b) => a.rel.localeCompare(b.rel))) {
            lines.push(`- [${e.title}](${e.url})`);
        }
        lines.push("");
    }

    const other = byCategory["Other"];
    if (other?.length) {
        lines.push(`### Other (${other.length})`);
        lines.push("");
        for (const e of other.sort((a, b) => a.rel.localeCompare(b.rel))) {
            lines.push(`- [${e.title}](${e.url})`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

function updateLlmsTxt(indexBlock) {
    let llms = fs.readFileSync(OUT_LLMS, "utf8");
    const block = `${INDEX_START}\n${indexBlock}\n${INDEX_END}`;
    if (llms.includes(INDEX_START) && llms.includes(INDEX_END)) {
        llms = llms.replace(
            new RegExp(`${INDEX_START}[\\s\\S]*?${INDEX_END}`),
            block,
        );
    } else {
        llms = `${llms.trim()}\n\n${block}\n`;
    }
    fs.writeFileSync(OUT_LLMS, llms, "utf8");
}

const mdFiles = getAllMdFiles(DOCS_DIR).sort();
fs.mkdirSync(path.dirname(OUT_FULL), { recursive: true });
fs.writeFileSync(OUT_FULL, buildFullTxt(mdFiles), "utf8");
updateLlmsTxt(buildIndex(mdFiles));
console.log(`Wrote ${OUT_FULL} (${mdFiles.length} doc pages)`);
console.log(`Updated ${OUT_LLMS} doc index (${mdFiles.length} URLs)`);
