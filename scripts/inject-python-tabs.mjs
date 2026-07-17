#!/usr/bin/env node
/**
 * Add Python SDK tabs after TypeScript tabs in docs pages.
 * Skips <Tabs> blocks that already include a Python tab.
 *
 * Usage: node docs/scripts/inject-python-tabs.mjs [--dry-run] [file.md ...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = path.join(__dirname, "..", "docs");
const DRY = process.argv.includes("--dry-run");
const filesArg = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function tsToPython(ts, curl) {
  const t = ts.trim();
  const c = (curl || "").trim();

  if (/auth\.login|client\.auth\.login/.test(t)) {
    return `from oneclaw import create_client

client = create_client()
client.auth.login("you@example.com", "your-password")
# JWT is managed internally — use \`client\` for subsequent calls`;
  }

  if (/agentToken|agent-token|ocv_/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client(api_key="ocv_your_agent_key")
print(client.resolved_agent_id)`;
  }

  if (/vault\.create|vaults\.create/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.vaults.create("My Vault", description="Secrets for my app")
vault_id = resp.data["id"]`;
  }

  if (/secrets\.set|secret\.set/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.secrets.set(
    vault_id,
    "api-keys/openai",
    "sk-proj-...",
    type="api_key",
    metadata={"tags": ["openai", "production"]},
)
print(resp.data["path"], f"v{resp.data['version']}")`;
  }

  if (/secrets\.get|secret\.get/.test(t) && !/secrets\.list/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
secret = client.secrets.get(vault_id, "api-keys/openai")
print(secret.data["value"])`;
  }

  if (/secrets\.list|secret\.list/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
data = client.secrets.list(vault_id)
for s in data.data["secrets"]:
    print(f"{s['path']} ({s['type']}, v{s['version']})")`;
  }

  if (/secrets\.delete|secret\.delete/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.secrets.delete(vault_id, "api-keys/openai")`;
  }

  if (/rotate_generate|rotateGenerate|secret-rotate|secrets\.rotate/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.secrets.rotate_generate(vault_id, "api-keys/openai", length=32, charset="base64")`;
  }

  if (/agents\.create|agent\.create/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.agents.create(
    "my-agent",
    description="CI/CD bot",
    intents_api_enabled=True,
)
agent = resp.data["agent"]
api_key = resp.data.get("api_key")  # shown once`;
  }

  if (/agents\.list|agent\.list/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
agents = client.agents.list()
for a in agents.data["agents"]:
    print(a["name"], a["id"])`;
  }

  if (/agents\.delete|deactivate|agents\.update/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.agents.deactivate(agent_id)`;
  }

  if (/grantAgent|policies\.create|access\.grant/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.policies.create(
    vault_id,
    principal_type="agent",
    principal_id=agent_id,
    secret_path_pattern="production/*",
    permissions=["read"],
)`;
  }

  if (/policies\.list|access\.list/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
policies = client.policies.list(vault_id)
for p in policies.data["policies"]:
    print(p["secret_path_pattern"], p["permissions"])`;
  }

  if (/policies\.delete|revoke/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.policies.delete(vault_id, policy_id)`;
  }

  if (/submitTransaction|submit_transaction|sign_intent|signIntent/.test(t)) {
    return `from oneclaw import create_client

client = create_client(api_key="ocv_...")
resp = client.agents.submit_transaction(
    agent_id,
    chain="ethereum",
    to="0x000000000000000000000000000000000000dEaD",
    value="0",
)
print(resp.data.get("tx_hash"))`;
  }

  if (/signingKeys|signing_keys|signing-keys/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
resp = client.signing_keys.create(agent_id, chain="ethereum")
print(resp.data["address"])`;
  }

  if (/audit/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
events = client.audit.list_events(limit=10)
for e in events.data.get("events", []):
    print(e["action"], e["resource_type"])`;
  }

  if (/share|sharing/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
client.sharing.create(vault_id, "api-keys/openai", recipient_type="external_email", recipient_email="peer@example.com")`;
  }

  if (/AgentsResource\.enroll|agents\.enroll/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client()
resp = client.agents.enroll(
    "my-agent",
    "alice@example.com",
    description="CI pipeline agent",
)
print(resp.data.get("agent_id"), resp.data.get("approval_url"))`;
  }

  if (/enroll/.test(t + c)) {
    return `from oneclaw import create_client

client = create_client()
client.agents.enroll("my-agent", "admin@example.com")`;
  }

  // curl fallbacks
  if (c.includes("/v1/auth/token")) {
    return tsToPython("client.auth.login", c);
  }
  if (c.includes("POST") && c.includes("/v1/vaults") && !c.includes("/secrets")) {
    return tsToPython("client.vaults.create", c);
  }
  if (c.includes("PUT") && c.includes("/secrets/")) {
    return tsToPython("client.secrets.set", c);
  }
  if (c.includes("GET") && c.includes("/secrets/") && !c.includes("/secrets\"")) {
    return tsToPython("client.secrets.get", c);
  }
  if (c.includes("GET") && c.match(/\/secrets["']/)) {
    return tsToPython("client.secrets.list", c);
  }
  if (c.includes("DELETE") && c.includes("/secrets/")) {
    return tsToPython("client.secrets.delete", c);
  }
  if (c.includes("POST") && c.includes("/agents")) {
    return tsToPython("client.agents.create", c);
  }
  if (c.includes("/policies")) {
    return tsToPython("client.policies.create", c);
  }

  return `from oneclaw import create_client

client = create_client(api_key="1ck_...")
# See the curl / TypeScript tabs for the equivalent call.
# Install: pip install oneclaw — https://docs.1claw.xyz/docs/sdks/python`;
}

function processTabsBlock(block) {
  if (block.includes('TabItem value="python"')) return block;
  if (!block.includes('TabItem value="typescript"')) return block;

  const tsMatch = block.match(
    /<TabItem value="typescript" label="[^"]*">\n\n```typescript\n([\s\S]*?)```\n\n<\/TabItem>/,
  );
  if (!tsMatch) return block;

  const curlMatch = block.match(
    /<TabItem value="curl" label="curl">\n\n```bash\n([\s\S]*?)```\n\n<\/TabItem>/,
  );

  const py = tsToPython(tsMatch[1], curlMatch?.[1] ?? "");
  const pythonTab = `<TabItem value="python" label="Python">\n\n\`\`\`python\n${py}\n\`\`\`\n\n</TabItem>`;

  return block.replace(
    /(<TabItem value="typescript" label="[^"]*">\n\n```typescript\n[\s\S]*?```\n\n<\/TabItem>)/,
    `$1\n${pythonTab}`,
  );
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes('TabItem value="typescript"')) return false;

  const updated = content.replace(/<Tabs[\s\S]*?<\/Tabs>/g, processTabsBlock);
  if (updated === content) return false;

  if (DRY) {
    console.log(`would update: ${path.relative(DOCS_ROOT, filePath)}`);
  } else {
    fs.writeFileSync(filePath, updated);
    console.log(`updated: ${path.relative(DOCS_ROOT, filePath)}`);
  }
  return true;
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const files =
  filesArg.length > 0
    ? filesArg.map((f) => path.resolve(f))
    : walk(DOCS_ROOT).filter((f) => {
        try {
          return fs.readFileSync(f, "utf8").includes('TabItem value="typescript"');
        } catch {
          return false;
        }
      });

let n = 0;
for (const f of files) {
  if (f.endsWith("sdks/python.md")) continue;
  if (processFile(f)) n++;
}
console.log(`${DRY ? "Would update" : "Updated"} ${n} file(s).`);
