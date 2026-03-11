import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Auto-detect which port the OpenPeep API is on
// Production: frontend on 3000 proxies /api to backend
// Dev mode: backend on 8000, frontend on 3000 (no proxy)
let API_BASE = process.env.OPENPEEP_API || "";

async function resolveApiBase(): Promise<string> {
  if (API_BASE) return API_BASE;
  // Try production port first (3000 with proxy), then dev backend (8000)
  for (const candidate of ["http://localhost:3000/api", "http://localhost:8000/api"]) {
    try {
      const res = await fetch(`${candidate}/health`, { signal: AbortSignal.timeout(2000) });
      const data = await res.json().catch(() => null);
      if (data && data.status === "ok") {
        API_BASE = candidate;
        return candidate;
      }
    } catch {}
  }
  // Default to production port
  API_BASE = "http://localhost:3000/api";
  return API_BASE;
}

async function api(path: string, options?: RequestInit) {
  const base = await resolveApiBase();
  const res = await fetch(`${base}${path}`, {
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
  instructions: `OpenPeep is a local file viewer that renders any file type with specialized viewers called "peeps." It runs at http://localhost:3000.

## How to create files for OpenPeep

1. Call get_file_template(peepId) to get the exact file format and a working sample
2. Create a project folder in the user's current working directory using the naming convention: YYYY-MM-DD_descriptive-name/ (e.g. "2026-03-11_team-standup/", "2026-03-11_system-architecture/")
3. Inside the project folder, create a project.json with metadata: {"name": "...", "description": "...", "type": "...", "status": "active"}
4. Write the actual file(s) inside the project folder using the template as a guide
5. Call preview_url(absolutePath) to give the user a link to view it in OpenPeep
6. Tell the user they can add the parent folder as a Space in OpenPeep (Settings → Spaces) to browse all projects in the sidebar

## Key concepts

- **Peeps**: Viewers/editors for specific file types (meeting notes, mermaid diagrams, markdown, JSON, etc.)
- **Spaces**: Project folders added to OpenPeep's sidebar for browsing. Each Space can have subfolders.
- **PeepHub**: Community registry where users can browse and install additional peeps

## Supported formats include

Meeting notes (.meeting.json with "type":"meeting-notes"), Mermaid diagrams (.mmd), Markdown (.md), JSON (.json), HTML (.html), SVG (.svg), images, audio, video, 3D models (.glb), and plain text. Call list_peeps() for the full list.

## Do NOT

- Put files directly at the root of the working directory — always create a dated project folder (YYYY-MM-DD_name/)
- Write files into existing OpenPeep Spaces or demo directories — those are read-only
- Guess at file formats — always call get_file_template first`,
});

// --- Basic tools: understanding what OpenPeep can render ---

server.tool(
  "list_peeps",
  "List all available peeps (viewers/editors) and what file types they handle. Use this to understand what file formats OpenPeep can render. Then call get_file_template(peepId) to get the exact file format and sample content before creating any file.",
  {},
  async () => {
    const data = await api("/peeps") as any;
    const summary = data.peeps.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tier: p._tier || p.tier,
      matches: p.matches,
      capabilities: p.capabilities,
    }));
    return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
  }
);

server.tool(
  "list_workspaces",
  "List configured OpenPeep Spaces (read-only). These are existing directories the user has added — do NOT write files to these paths.",
  {},
  async () => {
    const data = await api("/sources") as any;
    // Strip full paths so Claude doesn't use them as write targets
    const summary = (data.sources || []).map((s: any) => ({
      name: s.name || s.path?.split("/").pop() || "unknown",
      fileCount: s.files?.length || 0,
      fileTypes: [...new Set((s.files || []).map((f: any) => f.ext).filter(Boolean))],
    }));
    return { content: [{ type: "text" as const, text: `Existing OpenPeep Spaces (read-only, do NOT write here):\n${JSON.stringify(summary, null, 2)}\n\nTo create new files: make a new folder in your current working directory. The user can add it as a Space in OpenPeep later.` }] };
  }
);

server.tool(
  "preview_url",
  "Get the OpenPeep URL to preview a specific file. Returns a URL the user can open in their browser to see the file rendered by its matching peep.",
  { filePath: z.string().describe("Absolute path to the file to preview") },
  async ({ filePath }) => {
    const base = await resolveApiBase();
    // API base is like http://localhost:3000/api — strip /api for the frontend URL
    const frontendBase = base.replace(/\/api$/, "");
    const url = `${frontendBase}?file=${encodeURIComponent(filePath)}`;
    return { content: [{ type: "text" as const, text: `Preview: ${url}` }] };
  }
);

server.tool(
  "get_file_template",
  `Get the exact file format and sample content for a peep. Call this to understand the format, then pass the adapted content to create_openpeep_file to write it.`,
  { peepId: z.string().describe("Peep ID (e.g. 'meeting-notes', 'json-editor', 'mermaid-viewer')") },
  async ({ peepId }) => {
    const data = await api(`/peep-samples/${encodeURIComponent(peepId)}`) as any;
    const peeps = await api("/peeps") as any;
    const peep = peeps.peeps.find((p: any) => p.id === peepId);

    // Build sample files list, preferring non-binary files with content
    const sampleFiles = (data.files || [])
      .filter((f: any) => !f.binary && f.content)
      .map((f: any) => ({
        fileName: f.name,
        content: f.content,
      }));

    // Build creation hints
    const exts = peep?.matches?.extensions || [];
    const fileNames = peep?.matches?.fileNames || [];
    const contentMatch = peep?.matches?.contentMatch;

    const hints: string[] = [];
    if (exts.length) hints.push(`Use file extension: ${exts.join(" or ")}`);
    if (fileNames.length) hints.push(`Or name the file: ${fileNames.join(" or ")}`);
    if (contentMatch?.type === "json" && contentMatch.rules?.length) {
      const rule = contentMatch.rules[0];
      hints.push(`For JSON files: include "${rule.path}": "${rule.values[0]}" at the top level to trigger this peep`);
    }

    // Suggest a filename based on the first sample or extension
    let suggestedFileName = "";
    if (sampleFiles.length > 0) {
      // Use the sample's extension pattern (e.g. "sample.meeting.json" → "my-file.meeting.json")
      const sampleName = sampleFiles[0].fileName;
      const dotIndex = sampleName.indexOf(".");
      suggestedFileName = dotIndex >= 0 ? `<your-name>${sampleName.slice(dotIndex)}` : sampleName;
    } else if (exts.length > 0) {
      suggestedFileName = `<your-name>${exts[0]}`;
    }

    hints.push(`Create a dated project folder (YYYY-MM-DD_name/) in the cwd with a project.json, then put the file inside it.`);

    const result: any = {
      peepId,
      name: peep?.name || peepId,
      description: peep?.description || "",
      suggestedFileName,
      howToCreate: hints,
      sampleFiles,
    };

    const responseText = JSON.stringify(result, null, 2);
    return { content: [{ type: "text" as const, text: responseText }] };
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
