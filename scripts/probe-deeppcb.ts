#!/usr/bin/env npx tsx
/**
 * Probe the DeepPCB MCP server to list all available tools and their schemas.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(__dirname, "..");

// Load env
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
}

const apiKey = process.env.DEEPPCB_API_KEY;
if (!apiKey) {
  console.error("DEEPPCB_API_KEY not set");
  process.exit(1);
}

async function main() {
  const client = new Client({ name: "sparkbench-probe", version: "1.0.0" });
  const transport = new SSEClientTransport(
    new URL("https://mcp.deeppcb.ai/agent/tools/sse"),
    { requestInit: { headers: { Authorization: `Bearer ${apiKey}` } } }
  );

  console.log("Connecting to DeepPCB MCP...");
  await client.connect(transport);
  console.log("Connected!\n");

  const result = await client.listTools();
  console.log(`Found ${result.tools.length} tools:\n`);

  for (const tool of result.tools) {
    console.log(`--- ${tool.name} ---`);
    if (tool.description) console.log(`  Description: ${tool.description}`);
    if (tool.inputSchema) {
      const schema = tool.inputSchema as any;
      if (schema.properties) {
        console.log(`  Parameters:`);
        for (const [key, val] of Object.entries(schema.properties)) {
          const v = val as any;
          const req = schema.required?.includes(key) ? " (required)" : "";
          console.log(`    - ${key}: ${v.type || "unknown"}${req} — ${v.description || ""}`);
        }
      }
    }
    console.log();
  }

  await client.close();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
