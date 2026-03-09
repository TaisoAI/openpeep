#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.OPENPEEP_API || "http://localhost:3000/api";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

const server = new McpServer({
  name: "openpeep",
  version: "0.1.0",
});

// --- Basic tools: understanding what OpenPeep can render ---

server.tool(
  "list_peeps",
  "List all available peeps (viewers/editors) and what file types they handle. Use this to understand what file formats OpenPeep can render before creating files.",
  {},
  async () => {
    const data = await api("/peeps") as any;
    const summary = data.peeps.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tier: p.tier,
      matches: p.matches,
      capabilities: p.capabilities,
    }));
    return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
  }
);

server.tool(
  "list_workspaces",
  "List configured workspace directories and their contents. Use this to find where to create files.",
  {},
  async () => {
    const data = await api("/sources");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "preview_url",
  "Get the OpenPeep URL to preview a specific file. Returns a URL the user can open in their browser to see the file rendered by its matching peep.",
  { filePath: z.string().describe("Absolute path to the file to preview") },
  async ({ filePath }) => {
    const url = `http://localhost:3000?file=${encodeURIComponent(filePath)}`;
    return { content: [{ type: "text" as const, text: `Preview: ${url}` }] };
  }
);

// --- Advanced tools: building custom peeps ---

server.tool(
  "create_peep",
  `Scaffold a new custom peep (viewer/editor). Creates the directory structure with peep.json, index.html, and samples/.

A peep is a web app that renders a specific file type. It communicates with OpenPeep via the PeepSDK postMessage protocol:

## peep.json manifest spec:
{
  "id": "my-peep",
  "name": "My Peep",
  "version": "1.0.0",
  "description": "What this peep does",
  "author": "Author Name",
  "entry": "index.html",
  "capabilities": ["view", "edit", "save"],
  "matches": {
    "extensions": [".myext"],
    "fileNames": ["specific-name.json"],
    "contentMatch": { "type": "json", "rules": [{ "path": "type", "values": ["my-type"] }] }
  }
}

## PeepSDK API (available in index.html via <script src="/peep-sdk.js">):
- PeepSDK.ready() — signal that peep is loaded and ready to receive data
- PeepSDK.on("init", (data) => {}) — receive file content: { filePath, content, fileName, ext, binary, apiBase }
- PeepSDK.on("theme", (theme) => {}) — receive theme updates: { mode, style, tokens }
- PeepSDK.save(content) — save modified file content back to disk
- PeepSDK.rawFileUrl(path) — get URL to load binary files (images, audio, video, etc.)

## index.html template:
Include <script src="/peep-sdk.js"></script>, call PeepSDK.ready(), handle "init" event to receive file data, handle "theme" event for theming.

## samples/ directory:
Include at least one sample file demonstrating the peep. Name it sample.<ext>.`,
  {
    id: z.string().describe("Peep ID (kebab-case, e.g. 'my-viewer')"),
    name: z.string().describe("Display name"),
    description: z.string().describe("What this peep does"),
    extensions: z.array(z.string()).describe("File extensions to match (e.g. ['.myext'])"),
    capabilities: z.array(z.enum(["view", "edit", "save"])).default(["view"]),
    directory: z.string().optional().describe("Where to create the peep (defaults to ~/.openpeep/peeps/)"),
  },
  async ({ id, name, description, extensions, capabilities, directory }) => {
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");

    const baseDir = directory || path.join(os.homedir(), ".openpeep", "peeps");
    const peepDir = path.join(baseDir, id);

    fs.mkdirSync(path.join(peepDir, "samples"), { recursive: true });

    const manifest = {
      id, name, version: "1.0.0", description, author: "You",
      entry: "index.html", capabilities,
      matches: { extensions },
    };

    fs.writeFileSync(path.join(peepDir, "peep.json"), JSON.stringify(manifest, null, 2));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <script src="/peep-sdk.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; padding: 24px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    PeepSDK.ready();
    PeepSDK.on("init", (data) => {
      document.getElementById("app").textContent = data.content;
    });
    PeepSDK.on("theme", (theme) => {
      document.body.style.background = theme.tokens?.["bg-primary"] || "#fff";
      document.body.style.color = theme.tokens?.["text-primary"] || "#000";
    });
  <\/script>
</body>
</html>`;

    fs.writeFileSync(path.join(peepDir, "index.html"), html);
    fs.writeFileSync(path.join(peepDir, "samples", `sample${extensions[0]}`), "");

    return {
      content: [{
        type: "text" as const,
        text: `Created peep "${name}" at ${peepDir}\n\nFiles:\n- peep.json (manifest)\n- index.html (entry point — customize this)\n- samples/sample${extensions[0]} (sample file)\n\nNext: edit index.html to build your viewer, then open a ${extensions[0]} file in OpenPeep.`,
      }],
    };
  }
);

server.tool(
  "publish_peep",
  "Publish a peep to PeepHub so others can install it. Requires a PeepHub API key configured in OpenPeep settings.",
  { peepId: z.string().describe("ID of the peep to publish") },
  async ({ peepId }) => {
    const data = await api("/peeps/publish", {
      method: "POST",
      body: JSON.stringify({ peep_id: peepId }),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
