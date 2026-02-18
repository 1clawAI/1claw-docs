#!/usr/bin/env node
/**
 * Concatenates all docs/*.md (recursive) into static/llms-full.txt for LLM consumption.
 * Run at build time: node scripts/generate-llms-full.js
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "docs");
const OUT_FILE = path.join(__dirname, "..", "static", "llms-full.txt");

function getAllMdFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) getAllMdFiles(full, files);
    else if (e.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const mdFiles = getAllMdFiles(DOCS_DIR).sort();
const parts = [];

for (const file of mdFiles) {
  const rel = path.relative(DOCS_DIR, file);
  const content = fs.readFileSync(file, "utf8");
  // Extract title from first # heading or frontmatter
  let title = rel.replace(/\.md$/, "").replace(/\//g, " / ");
  const match = content.match(/^#\s+(.+)$/m) || content.match(/^title:\s*["']?([^"'\n]+)/m);
  if (match) title = match[1].trim();
  parts.push(`## ${title}\n\n${content}`);
}

const output = parts.join("\n\n---\n\n");
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, output, "utf8");
console.log(`Wrote ${OUT_FILE} (${mdFiles.length} doc pages)`);
