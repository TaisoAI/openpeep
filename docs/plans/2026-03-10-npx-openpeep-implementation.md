# npx openpeep — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `npx openpeep` as a single-command install + run experience with progressive demo workspace, Claude Code MCP plugin auto-install, background daemon management, and a `doctor` diagnostic command.

**Architecture:** Single npm package containing a Node.js CLI, the Python backend source, and a pre-built React frontend. CLI manages a Python venv at `~/.openpeep/venv/`, spawns FastAPI as a background daemon, and serves the frontend as static files. An MCP server binary enables Claude Code integration.

**Tech Stack:** Node.js CLI (no framework, just `readline` + `child_process`), Python/FastAPI backend, React/Vite frontend (pre-built), MCP SDK (TypeScript)

---

## Phase 1: CLI Scaffold + Static Serving

### Task 1: Create CLI package structure

**Files:**
- Create: `cli/index.js`
- Create: `cli/package.json`
- Modify: `package.json` (root)

**Step 1: Create `cli/package.json`**

```json
{
  "name": "openpeep",
  "version": "0.1.0",
  "description": "Every file type deserves its own app",
  "bin": {
    "openpeep": "index.js"
  },
  "files": [
    "index.js",
    "lib/",
    "../backend/",
    "../frontend/dist/",
    "../peeps/",
    "../samples/"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "keywords": ["openpeep", "file-viewer", "claude-code", "peep"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/TaisoAI/openpeep"
  }
}
```

**Step 2: Create `cli/index.js` — entry point with subcommand routing**

```js
#!/usr/bin/env node

const command = process.argv[2] || "start";

const COMMANDS = {
  start: () => require("./lib/start").run(),
  stop: () => require("./lib/stop").run(),
  restart: () => require("./lib/restart").run(),
  status: () => require("./lib/status").run(),
  doctor: () => require("./lib/doctor").run(),
  help: () => printHelp(),
};

function printHelp() {
  console.log(`
  Usage: openpeep [command]

  Commands:
    (default)   Start OpenPeep (runs wizard on first use)
    stop        Stop the background server
    restart     Restart the server
    status      Show server status
    doctor      Deep inspection + auto-repair

  Options:
    --foreground    Run server in foreground (for debugging)
    --port <n>      Use a custom port (default: 3000)
    --help          Show this help
`);
}

const handler = COMMANDS[command] || COMMANDS.help;
handler();
```

**Step 3: Update root `package.json` — add build script for CLI packaging**

Add to root `package.json` scripts:

```json
{
  "scripts": {
    "build:cli": "cd frontend && npm run build && cp -r dist ../cli/frontend-dist",
    "prepublish:cli": "npm run build:cli"
  }
}
```

**Step 4: Commit**

```bash
git add cli/index.js cli/package.json package.json
git commit -m "feat: scaffold CLI package with subcommand routing"
```

---

### Task 2: Detect first run + paths module

**Files:**
- Create: `cli/lib/paths.js`
- Create: `cli/lib/first-run.js`

**Step 1: Create `cli/lib/paths.js` — all path constants**

```js
const path = require("path");
const os = require("os");

const OPENPEEP_HOME = path.join(os.homedir(), ".openpeep");
const CONFIG_PATH = path.join(OPENPEEP_HOME, "config.json");
const VENV_PATH = path.join(OPENPEEP_HOME, "venv");
const PID_PATH = path.join(OPENPEEP_HOME, "openpeep.pid");
const LOG_DIR = path.join(OPENPEEP_HOME, "logs");
const DEMO_DIR = path.join(OPENPEEP_HOME, "demo");
const PEEPS_DIR = path.join(OPENPEEP_HOME, "peeps");

// Paths relative to the npm package (where cli/index.js lives)
const PKG_ROOT = path.resolve(__dirname, "../..");
const PKG_BACKEND = path.join(PKG_ROOT, "backend");
const PKG_FRONTEND_DIST = path.join(PKG_ROOT, "cli", "frontend-dist");
const PKG_PEEPS = path.join(PKG_ROOT, "peeps");
const PKG_SAMPLES = path.join(PKG_ROOT, "samples");
const PKG_REQUIREMENTS = path.join(PKG_ROOT, "backend", "requirements.txt");

module.exports = {
  OPENPEEP_HOME, CONFIG_PATH, VENV_PATH, PID_PATH, LOG_DIR, DEMO_DIR, PEEPS_DIR,
  PKG_ROOT, PKG_BACKEND, PKG_FRONTEND_DIST, PKG_PEEPS, PKG_SAMPLES, PKG_REQUIREMENTS,
};
```

**Step 2: Create `cli/lib/first-run.js` — detect whether setup has been done**

```js
const fs = require("fs");
const { OPENPEEP_HOME, CONFIG_PATH, VENV_PATH } = require("./paths");

function isFirstRun() {
  return !fs.existsSync(CONFIG_PATH) || !fs.existsSync(VENV_PATH);
}

module.exports = { isFirstRun };
```

**Step 3: Commit**

```bash
git add cli/lib/paths.js cli/lib/first-run.js
git commit -m "feat: add paths module and first-run detection"
```

---

### Task 3: Python venv setup

**Files:**
- Create: `cli/lib/setup-python.js`

**Step 1: Create `cli/lib/setup-python.js`**

```js
const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { VENV_PATH, PKG_REQUIREMENTS } = require("./paths");

function checkPython() {
  for (const cmd of ["python3", "python"]) {
    try {
      const version = execFileSync(cmd, ["--version"], { encoding: "utf8" }).trim();
      const match = version.match(/(\d+)\.(\d+)/);
      if (match && (parseInt(match[1]) > 3 || (parseInt(match[1]) === 3 && parseInt(match[2]) >= 11))) {
        return { command: cmd, version };
      }
    } catch {}
  }
  return null;
}

function createVenv(pythonCmd) {
  if (fs.existsSync(VENV_PATH)) return;
  execFileSync(pythonCmd, ["-m", "venv", VENV_PATH], { stdio: "pipe" });
}

function installDeps() {
  const pip = path.join(VENV_PATH, "bin", "pip");
  execFileSync(pip, ["install", "-r", PKG_REQUIREMENTS, "--quiet"], { stdio: "pipe" });
}

function setupPython(log) {
  const python = checkPython();
  if (!python) {
    console.error("  ✗ Python 3.11+ not found. Install it from https://python.org");
    process.exit(1);
  }
  log(`  ✓ ${python.version}`);

  if (!fs.existsSync(VENV_PATH)) {
    log("  ⠋ Creating Python environment...");
    createVenv(python.command);
    installDeps();
    log("  ✓ Backend ready");
  } else {
    log("  ✓ Python environment exists");
  }
}

module.exports = { checkPython, createVenv, installDeps, setupPython };
```

**Step 2: Commit**

```bash
git add cli/lib/setup-python.js
git commit -m "feat: add Python venv auto-setup"
```

---

### Task 4: FastAPI static file serving

**Files:**
- Modify: `backend/main.py`

**Step 1: Add static file serving to FastAPI**

Add to `backend/main.py` — serve the pre-built frontend when `OPENPEEP_STATIC_DIR` env var is set (production mode). In dev mode (no env var), the Vite dev server handles frontend.

```python
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routers import files, sources, peeps

app = FastAPI(title="OpenPeep", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://localhost:5174").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(peeps.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


# Serve pre-built frontend in production mode
_static_dir = os.environ.get("OPENPEEP_STATIC_DIR")
if _static_dir and Path(_static_dir).is_dir():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")
```

**Step 2: Test locally**

```bash
# Build frontend
cd frontend && npm run build && cd ..
# Start backend with static serving
OPENPEEP_STATIC_DIR=frontend/dist uvicorn backend.main:app --port 3000
```

Open `http://localhost:3000` — should serve the React app AND the API.

**Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: serve pre-built frontend via FastAPI static files"
```

---

## Phase 2: Onboarding Wizard

### Task 5: Interactive wizard

**Files:**
- Create: `cli/lib/wizard.js`

**Step 1: Create the wizard**

Uses Node's built-in `readline` for prompts. No external dependencies.

```js
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { OPENPEEP_HOME, CONFIG_PATH, DEMO_DIR } = require("./paths");

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` (${defaultVal})` : "";
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function askYN(rl, question, defaultYes = true) {
  return new Promise((resolve) => {
    const hint = defaultYes ? "(Y/n)" : "(y/N)";
    rl.question(`  ${question} ${hint} `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

async function runWizard() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("");
  console.log("  ┌─────────────────────────────────────┐");
  console.log("  │  Welcome to OpenPeep v0.1.0         │");
  console.log("  └─────────────────────────────────────┘");
  console.log("");

  // 1. Ask for project directory
  const home = require("os").homedir();
  const projectDir = await ask(rl, "Where do you keep your projects?", "~/Projects");
  const expandedDir = projectDir.replace(/^~/, home);

  // 2. Create config
  fs.mkdirSync(OPENPEEP_HOME, { recursive: true });

  const config = {
    spaces: [
      {
        name: "My Projects",
        icon: "📁",
        roots: [expandedDir],
        statuses: ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
      },
      {
        name: "OpenPeep Demo",
        icon: "🎯",
        roots: [DEMO_DIR],
        statuses: ["1-Basics", "2-Structured", "3-Custom Types", "4-Bundles"],
      },
    ],
    defaultStatuses: ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
    fileAssociations: { overrides: [] },
    peepSettings: {},
    devMode: false,
    peephub: { url: "https://peephub.taiso.ai", apiKey: "" },
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("  ✓ Config saved");

  // 3. Copy demo workspace
  console.log("");
  console.log("  Setting up demo workspace with sample files...");
  const { setupDemoWorkspace } = require("./demo");
  setupDemoWorkspace();
  console.log("  ✓ ~/.openpeep/demo/ created");
  console.log("    ├── 1-basics/        (txt, png, jpg, pdf, mp3)");
  console.log("    ├── 2-structured/    (md, json, csv)");
  console.log("    ├── 3-custom-types/  (meeting notes, slides, DSLs)");
  console.log("    ├── 4-bundles/       (folder-level peeps)");
  console.log("    └── START-HERE.md");
  console.log("");

  // 4. Claude Code plugin
  const installPlugin = await askYN(rl, "Install Claude Code plugin?");
  if (installPlugin) {
    const { installClaudePlugin } = require("./claude-plugin");
    const result = installClaudePlugin();
    if (result.success) {
      console.log("  ✓ Added OpenPeep MCP server to Claude Code");
    } else {
      console.log(`  ⚠ ${result.message}`);
    }
  }

  rl.close();
  return config;
}

module.exports = { runWizard };
```

**Step 2: Commit**

```bash
git add cli/lib/wizard.js
git commit -m "feat: add interactive onboarding wizard"
```

---

### Task 6: Demo workspace builder

**Files:**
- Create: `cli/lib/demo.js`
- Create: `samples/START-HERE.md`
- Create: `samples/1-basics/` (sample files)
- Create: `samples/2-structured/` (sample files)
- Create: `samples/3-custom-types/` (sample files)
- Create: `samples/4-bundles/` (sample files)

**Step 1: Create `cli/lib/demo.js` — copies sample files to `~/.openpeep/demo/`**

```js
const fs = require("fs");
const path = require("path");
const { DEMO_DIR, PKG_SAMPLES } = require("./paths");

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function setupDemoWorkspace() {
  if (fs.existsSync(DEMO_DIR)) return; // don't overwrite
  copyRecursive(PKG_SAMPLES, DEMO_DIR);
}

module.exports = { setupDemoWorkspace };
```

**Step 2: Create `samples/START-HERE.md`**

```markdown
# Welcome to OpenPeep!

Every file type deserves its own app. OpenPeep matches files to custom viewers
and editors called **Peeps**.

## Explore the Demo

This workspace has four levels of sample files. Click any file to see its Peep:

### 1-Basics
Standard files you already know — text, images, PDF, audio.
OpenPeep gives them real viewers instead of raw bytes.

### 2-Structured
Markdown, JSON, CSV — files you know, but with rich editors
(live preview, syntax highlighting, sortable tables).

### 3-Custom Types
Meeting notes (`.mn`), slide decks (`.slides.md`), and custom JSON schemas.
These are DSL files that map to purpose-built apps.

### 4-Bundles
Entire folders become apps — kanban boards, dashboards, and more.

---

## Try It with Claude Code

OpenPeep pairs with Claude Code. Try these prompts:

1. **"Create a meeting notes file for tomorrow's standup"**
   → Claude creates a `.mn` file → OpenPeep renders it as a meeting app

2. **"Make a slide deck about our Q1 results"**
   → Claude creates a `.slides.md` file → OpenPeep renders it as a presentation

3. **"Create a CSV tracking my monthly expenses"**
   → Claude creates a `.csv` file → OpenPeep renders it as a sortable spreadsheet

4. **"Create a project plan as a gantt chart"**
   → Claude creates a `.gantt.json` file → OpenPeep renders it as an interactive timeline

OpenPeep will preview them live as Claude creates them!

---

## Learn More

- [GitHub](https://github.com/TaisoAI/openpeep)
- [PeepHub](https://peephub.taiso.ai) — browse and install community peeps
- [Building Peeps](https://github.com/TaisoAI/openpeep/blob/main/docs/PEEP_DEV_GUIDE.md) — create your own (advanced)
```

**Step 3: Create sample files for each level**

`samples/1-basics/`:
- `hello.txt` — a short welcome text file
- `sample.svg` — a simple SVG graphic

`samples/2-structured/`:
- `notes.md` — a markdown file with headings, lists, code blocks
- `config.json` — a sample JSON config
- `data.csv` — a small dataset (5 rows)

`samples/3-custom-types/`:
- `standup.mn` — meeting notes JSON with `"type": "meeting-notes"`
- `pitch.slides.md` — a 3-slide presentation in Reveal.js markdown
- `diagram.mmd` — a mermaid diagram

`samples/4-bundles/`:
- A folder with a few project files demonstrating folder-level peep matching

Note: Use existing sample files from `peeps/*/samples/` and `showcase-peeps/*/samples/` where possible — copy and rename them. Don't create from scratch unless needed.

**Step 4: Commit**

```bash
git add cli/lib/demo.js samples/
git commit -m "feat: add demo workspace with progressive sample files"
```

---

### Task 7: Claude Code plugin installer

**Files:**
- Create: `cli/lib/claude-plugin.js`

**Step 1: Create `cli/lib/claude-plugin.js`**

```js
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), ".claude.json");

function installClaudePlugin() {
  // Check if Claude Code config exists
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) {
    return { success: false, message: "Claude Code not detected (~/.claude.json not found). Install Claude Code first, then run: openpeep doctor --fix" };
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
  } catch {
    return { success: false, message: "Could not parse ~/.claude.json" };
  }

  // Add MCP server entry
  if (!config.mcpServers) config.mcpServers = {};

  // Find the openpeep-mcp binary path
  // When installed globally: uses the bin from node_modules
  // When using npx: resolve from package location
  const mcpBin = path.resolve(__dirname, "../../mcp/dist/index.js");

  config.mcpServers.openpeep = {
    command: "node",
    args: [mcpBin],
  };

  fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
  return { success: true };
}

function isPluginInstalled() {
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
    return !!(config.mcpServers && config.mcpServers.openpeep);
  } catch {
    return false;
  }
}

function removePlugin() {
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) return;
  try {
    const config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
    if (config.mcpServers) delete config.mcpServers.openpeep;
    fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch {}
}

module.exports = { installClaudePlugin, isPluginInstalled, removePlugin };
```

**Step 2: Commit**

```bash
git add cli/lib/claude-plugin.js
git commit -m "feat: add Claude Code MCP plugin auto-installer"
```

---

## Phase 3: Daemon Management (start/stop/restart/status)

### Task 8: Start command + daemon

**Files:**
- Create: `cli/lib/start.js`

**Step 1: Create `cli/lib/start.js`**

```js
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { OPENPEEP_HOME, VENV_PATH, PID_PATH, LOG_DIR, CONFIG_PATH,
        PKG_BACKEND, PKG_FRONTEND_DIST, PKG_ROOT } = require("./paths");
const { isFirstRun } = require("./first-run");
const { setupPython } = require("./setup-python");
const { runWizard } = require("./wizard");

async function run() {
  const foreground = process.argv.includes("--foreground");
  const portArg = process.argv.indexOf("--port");
  const port = portArg !== -1 ? parseInt(process.argv[portArg + 1]) : 3000;

  // Check if already running
  if (isRunning()) {
    const pid = fs.readFileSync(PID_PATH, "utf8").trim();
    console.log(`  ✓ OpenPeep already running → http://localhost:${port} (pid ${pid})`);
    return;
  }

  // First run → wizard
  if (isFirstRun()) {
    console.log("");
    console.log("  Checking requirements...");
    setupPython(console.log);
    console.log("");
    await runWizard();
    console.log("");
  }

  // Start the server
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const pythonBin = path.join(VENV_PATH, "bin", "python");
  const env = {
    ...process.env,
    OPENPEEP_STATIC_DIR: PKG_FRONTEND_DIST,
    OPENPEEP_CONFIG: CONFIG_PATH,
    PYTHONPATH: PKG_ROOT,
  };

  if (foreground) {
    console.log(`  Starting OpenPeep (foreground) → http://localhost:${port}`);
    console.log("  Press Ctrl+C to stop.");
    console.log("");
    const child = spawn(pythonBin, [
      "-m", "uvicorn", "backend.main:app", "--port", String(port),
    ], { env, stdio: "inherit", cwd: PKG_ROOT });
    child.on("exit", () => process.exit());
    return;
  }

  // Background daemon
  const logFile = path.join(LOG_DIR, "server.log");
  const out = fs.openSync(logFile, "a");
  const child = spawn(pythonBin, [
    "-m", "uvicorn", "backend.main:app", "--port", String(port),
  ], { env, stdio: ["ignore", out, out], detached: true, cwd: PKG_ROOT });

  child.unref();
  fs.writeFileSync(PID_PATH, String(child.pid));

  console.log(`  ✓ OpenPeep running → http://localhost:${port} (pid ${child.pid})`);
  printClaudePrompts();
}

function isRunning() {
  if (!fs.existsSync(PID_PATH)) return false;
  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function printClaudePrompts() {
  console.log("");
  console.log("  ──────────────────────────────────────");
  console.log("  Try these in Claude Code:");
  console.log("");
  console.log('  1. "create a meeting notes file for tomorrow\'s standup"');
  console.log('  2. "make a slide deck about our Q1 results"');
  console.log('  3. "create a CSV tracking my monthly expenses"');
  console.log('  4. "create a json config for a new project"');
  console.log("");
  console.log("  OpenPeep will preview them live!");
  console.log("  ──────────────────────────────────────");
  console.log("");
}

module.exports = { run, isRunning };
```

**Step 2: Commit**

```bash
git add cli/lib/start.js
git commit -m "feat: add start command with background daemon support"
```

---

### Task 9: Stop, restart, status commands

**Files:**
- Create: `cli/lib/stop.js`
- Create: `cli/lib/restart.js`
- Create: `cli/lib/status.js`

**Step 1: Create `cli/lib/stop.js`**

```js
const fs = require("fs");
const { PID_PATH } = require("./paths");

function run() {
  if (!fs.existsSync(PID_PATH)) {
    console.log("  OpenPeep is not running.");
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  try {
    process.kill(pid, "SIGTERM");
    fs.unlinkSync(PID_PATH);
    console.log("  ✓ Stopped");
  } catch {
    fs.unlinkSync(PID_PATH);
    console.log("  ✓ Cleaned up stale PID file");
  }
}

module.exports = { run };
```

**Step 2: Create `cli/lib/restart.js`**

```js
async function run() {
  const stop = require("./stop");
  stop.run();
  // Brief pause for port to free up
  await new Promise((r) => setTimeout(r, 1000));
  const start = require("./start");
  await start.run();
}

module.exports = { run };
```

**Step 3: Create `cli/lib/status.js`**

```js
const fs = require("fs");
const http = require("http");
const { PID_PATH } = require("./paths");
const { isPluginInstalled } = require("./claude-plugin");

function run() {
  if (!fs.existsSync(PID_PATH)) {
    console.log("  OpenPeep is not running.");
    console.log('  Start it with: npx openpeep');
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  let running = false;
  try { process.kill(pid, 0); running = true; } catch {}

  if (!running) {
    fs.unlinkSync(PID_PATH);
    console.log("  OpenPeep is not running (stale PID cleaned up).");
    return;
  }

  // Check health endpoint
  const req = http.get("http://localhost:3000/api/health", (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      try {
        const health = JSON.parse(data);
        console.log(`  ✓ Running on http://localhost:3000 (pid ${pid})`);
        console.log(`  ✓ Version: ${health.version}`);
        console.log(`  ✓ Claude Code plugin: ${isPluginInstalled() ? "installed" : "not installed"}`);
      } catch {
        console.log(`  ⚠ Running (pid ${pid}) but health check returned unexpected response`);
      }
    });
  });
  req.on("error", () => {
    console.log(`  ⚠ Process running (pid ${pid}) but not responding on port 3000`);
  });
  req.end();
}

module.exports = { run };
```

**Step 4: Commit**

```bash
git add cli/lib/stop.js cli/lib/restart.js cli/lib/status.js
git commit -m "feat: add stop, restart, and status commands"
```

---

## Phase 4: Doctor

### Task 10: Doctor — deep inspection + auto-repair

**Files:**
- Create: `cli/lib/doctor.js`

**Step 1: Create `cli/lib/doctor.js`**

```js
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const {
  OPENPEEP_HOME, CONFIG_PATH, VENV_PATH, PID_PATH,
  PKG_PEEPS, PKG_REQUIREMENTS,
} = require("./paths");
const { checkPython, createVenv, installDeps } = require("./setup-python");
const { isPluginInstalled, installClaudePlugin } = require("./claude-plugin");
const { isRunning } = require("./start");

const FIX = process.argv.includes("--fix");

let issues = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg, fix) {
  issues++;
  console.log(`  ✗ ${msg}`);
  if (fix) console.log(`    → ${fix}`);
}

async function run() {
  console.log("");
  console.log("  OpenPeep Doctor v0.1.0");
  console.log("  ─────────────────────────────────────");
  console.log("");

  // --- Runtime ---
  console.log("  Runtime");
  const node = process.versions.node;
  const nodeMajor = parseInt(node.split(".")[0]);
  if (nodeMajor >= 20) pass(`Node.js ${node}`);
  else fail(`Node.js ${node} (need 20+)`, "Update Node.js: https://nodejs.org");

  const python = checkPython();
  if (python) pass(python.version);
  else fail("Python 3.11+ not found", "Install from https://python.org");

  console.log("");

  // --- Environment ---
  console.log("  Environment");
  if (fs.existsSync(VENV_PATH)) {
    // Check venv health
    const pythonBin = path.join(VENV_PATH, "bin", "python");
    try {
      execFileSync(pythonBin, ["--version"], { encoding: "utf8" });
      pass(`Venv: ${VENV_PATH}`);
    } catch {
      fail("Venv exists but Python binary broken", FIX ? "Recreating..." : 'Run: openpeep doctor --fix');
      if (FIX) {
        fs.rmSync(VENV_PATH, { recursive: true, force: true });
        if (python) { createVenv(python.command); installDeps(); pass("Venv recreated"); }
      }
    }
  } else {
    fail("No Python venv found", FIX ? "Creating..." : 'Run: openpeep doctor --fix');
    if (FIX && python) { createVenv(python.command); installDeps(); pass("Venv created"); }
  }

  if (fs.existsSync(CONFIG_PATH)) pass(`Config: ${CONFIG_PATH}`);
  else fail("No config file", 'Run: npx openpeep (wizard will create it)');

  // Check port
  await new Promise((resolve) => {
    if (isRunning()) {
      pass("Port 3000: in use by OpenPeep");
      resolve();
    } else {
      const server = require("net").createServer();
      server.once("error", () => { fail("Port 3000: in use by another process"); resolve(); });
      server.once("listening", () => { server.close(); pass("Port 3000: available"); resolve(); });
      server.listen(3000);
    }
  });

  console.log("");

  // --- Peeps ---
  console.log("  Peeps");
  if (fs.existsSync(PKG_PEEPS)) {
    const peepDirs = fs.readdirSync(PKG_PEEPS).filter((d) =>
      fs.statSync(path.join(PKG_PEEPS, d)).isDirectory()
    );
    let valid = 0;
    for (const dir of peepDirs) {
      const peepJson = path.join(PKG_PEEPS, dir, "peep.json");
      if (fs.existsSync(peepJson)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(peepJson, "utf8"));
          if (!manifest.id || !manifest.matches) {
            fail(`Peep "${dir}" — invalid peep.json (missing id or matches)`);
          } else {
            valid++;
          }
        } catch {
          fail(`Peep "${dir}" — invalid JSON in peep.json`);
        }
      }
    }
    pass(`${valid} built-in peeps loaded`);
  }

  // Installed peeps
  const installedDir = path.join(OPENPEEP_HOME, "peeps");
  if (fs.existsSync(installedDir)) {
    const installed = fs.readdirSync(installedDir).filter((d) =>
      fs.statSync(path.join(installedDir, d)).isDirectory()
    );
    pass(`${installed.length} installed peeps (from PeepHub)`);
  }

  console.log("");

  // --- Workspaces ---
  console.log("  Workspaces");
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      for (const space of config.spaces || []) {
        for (const root of space.roots || []) {
          const expanded = root.replace(/^~/, require("os").homedir());
          if (fs.existsSync(expanded)) pass(`${root}`);
          else fail(`${root} — directory not found`, FIX ? "Skipping (edit config manually)" : "Remove from config or create directory");
        }
      }
    } catch {
      fail("Could not parse config.json");
    }
  }

  console.log("");

  // --- Claude Code Integration ---
  console.log("  Claude Code Integration");
  const claudeConfig = path.join(require("os").homedir(), ".claude.json");
  if (fs.existsSync(claudeConfig)) {
    pass("Claude Code detected (~/.claude.json)");
    if (isPluginInstalled()) {
      pass("OpenPeep MCP server registered");
    } else {
      fail("OpenPeep MCP server not registered", FIX ? "Installing..." : 'Run: openpeep doctor --fix');
      if (FIX) {
        const result = installClaudePlugin();
        if (result.success) pass("Plugin installed");
        else fail(result.message);
      }
    }
  } else {
    fail("Claude Code not detected", "Install from https://claude.ai/code");
  }

  console.log("");

  // --- PeepHub ---
  console.log("  PeepHub");
  await new Promise((resolve) => {
    const https = require("https");
    const req = https.get("https://peephub.taiso.ai/api/health", { timeout: 5000 }, (res) => {
      pass("peephub.taiso.ai reachable");
      resolve();
    });
    req.on("error", () => { fail("peephub.taiso.ai unreachable"); resolve(); });
    req.on("timeout", () => { req.destroy(); fail("peephub.taiso.ai timed out"); resolve(); });
  });

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      if (config.peephub?.apiKey) pass("API key configured");
      else fail("API key not set (publish won't work)", "Set in OpenPeep Settings or config.json");
    } catch {}
  }

  console.log("");

  // --- Summary ---
  console.log("  ─────────────────────────────────────");
  if (issues === 0) {
    console.log("  All checks passed!");
  } else {
    console.log(`  ${issues} issue${issues > 1 ? "s" : ""} found.${FIX ? "" : ' Run "openpeep doctor --fix" to auto-repair.'}`);
  }
  console.log("");
}

module.exports = { run };
```

**Step 2: Test doctor**

```bash
node cli/index.js doctor
```

Expected: categorized output with ✓ and ✗ for each check.

**Step 3: Commit**

```bash
git add cli/lib/doctor.js
git commit -m "feat: add doctor command with deep inspection and auto-repair"
```

---

## Phase 5: MCP Server for Claude Code

### Task 11: Scaffold MCP server

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/tsconfig.json`
- Create: `mcp/src/index.ts`

**Step 1: Create `mcp/package.json`**

```json
{
  "name": "@openpeep/claude-code",
  "version": "0.1.0",
  "description": "Claude Code plugin for OpenPeep — create files, preview peeps, build custom viewers",
  "main": "dist/index.js",
  "bin": { "openpeep-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 2: Create `mcp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 3: Create `mcp/src/index.ts` — MCP server with tools**

The MCP server connects to the running OpenPeep backend API. Tools are split into basic (creating files) and advanced (building peeps).

```typescript
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

// --- Basic tools: creating files that peeps render ---

server.tool(
  "list_peeps",
  "List all available peeps (viewers/editors) and what file types they handle. Use this to understand what file formats OpenPeep can render before creating files.",
  {},
  async () => {
    const data = await api("/peeps");
    const summary = data.peeps.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tier: p.tier,
      matches: p.matches,
      capabilities: p.capabilities,
    }));
    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }
);

server.tool(
  "list_workspaces",
  "List configured workspace directories and their contents. Use this to find where to create files.",
  {},
  async () => {
    const data = await api("/sources");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "preview_url",
  "Get the OpenPeep URL to preview a specific file. Returns a URL the user can open in their browser.",
  { filePath: z.string().describe("Absolute path to the file to preview") },
  async ({ filePath }) => {
    const url = `http://localhost:3000?file=${encodeURIComponent(filePath)}`;
    return { content: [{ type: "text", text: `Preview: ${url}` }] };
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

## PeepSDK API (available in index.html):
- PeepSDK.ready() — signal that peep is loaded
- PeepSDK.on("init", (data) => {}) — receive file content: { filePath, content, fileName, ext, binary, apiBase }
- PeepSDK.on("theme", (theme) => {}) — receive theme updates: { mode, style, tokens }
- PeepSDK.save(content) — save file content back
- PeepSDK.rawFileUrl(path) — get URL to load binary files (images, audio, etc.)

## index.html template:
The HTML file should include <script src="/peep-sdk.js"></script> and use PeepSDK to receive and display file content.

## samples/ directory:
Include at least one sample file that demonstrates the peep. Name it sample.<ext>.`,
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
        type: "text",
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
    const data = await api(`/peeps/publish`, {
      method: "POST",
      body: JSON.stringify({ peep_id: peepId }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

**Step 4: Install deps and build**

```bash
cd mcp && npm install && npm run build
```

**Step 5: Commit**

```bash
git add mcp/
git commit -m "feat: add MCP server for Claude Code integration"
```

---

## Phase 6: Build Pipeline + README

### Task 12: Build pipeline for npm publish

**Files:**
- Modify: `package.json` (root)
- Modify: `cli/package.json`
- Create: `.npmignore` (or configure `files` in package.json)

**Step 1: Update root `package.json` with full build pipeline**

```json
{
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "./venv/bin/uvicorn backend.main:app --reload --port 8000",
    "setup": "npm run setup:backend && npm run setup:frontend",
    "setup:backend": "python3 -m venv venv && ./venv/bin/pip install -r backend/requirements.txt",
    "setup:frontend": "cd frontend && npm install",
    "build": "npm run build:frontend && npm run build:mcp",
    "build:frontend": "cd frontend && npm run build && mkdir -p ../cli/frontend-dist && cp -r dist/* ../cli/frontend-dist/",
    "build:mcp": "cd mcp && npm install && npm run build",
    "lint": "cd frontend && npm run lint"
  }
}
```

**Step 2: Update `cli/package.json` files field to include all needed artifacts**

```json
{
  "files": [
    "index.js",
    "lib/",
    "frontend-dist/",
    "../backend/**/*.py",
    "../backend/requirements.txt",
    "../peeps/",
    "../samples/",
    "../mcp/dist/"
  ]
}
```

Note: The exact `files` glob will need testing — npm packing only includes files relative to `package.json` location. May need to restructure so `cli/` is the publish root, or use a flat structure. Test with `npm pack --dry-run` in the `cli/` directory.

**Step 3: Commit**

```bash
git add package.json cli/package.json
git commit -m "feat: add build pipeline for npm publish"
```

---

### Task 13: Update README for npx install

**Files:**
- Modify: `README.md`

**Step 1: Rewrite Quick Start section**

Replace the current multi-step clone/setup instructions with:

```markdown
## Quick Start

```bash
npx openpeep
```

That's it. The wizard will:
1. Check Python 3.11+ and Node.js 20+ are installed
2. Create a Python environment
3. Ask where you keep your projects
4. Set up a demo workspace with sample files
5. Offer to install the Claude Code plugin
6. Start OpenPeep

### Commands

```bash
npx openpeep              # Start (wizard on first run)
npx openpeep stop          # Stop the server
npx openpeep restart       # Restart
npx openpeep status        # Check if running
npx openpeep doctor        # Diagnose issues
npx openpeep doctor --fix  # Auto-repair issues
```

### For Contributors

Clone and run in dev mode:

```bash
git clone https://github.com/TaisoAI/openpeep.git
cd openpeep
npm run setup
npm run dev
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with npx openpeep quick start"
```

---

### Task 14: End-to-end test

**Step 1: Build everything**

```bash
npm run build
```

**Step 2: Test the CLI locally**

```bash
# Simulate npx by running cli/index.js directly
node cli/index.js
```

Expected: wizard runs, creates `~/.openpeep/`, sets up demo workspace, offers Claude Code plugin, starts server.

**Step 3: Test each command**

```bash
node cli/index.js status    # should show running
node cli/index.js stop      # should stop
node cli/index.js status    # should show not running
node cli/index.js           # should start without wizard (already set up)
node cli/index.js doctor    # should show all checks
```

**Step 4: Test demo workspace**

Open `http://localhost:3000` and verify:
- Demo workspace appears with the 4 level folders
- Clicking sample files opens the correct peep
- START-HERE.md renders in the markdown editor

**Step 5: Test Claude Code integration**

Open Claude Code and try:
- "list my installed peeps" → should use the MCP tool
- "create a meeting notes file" → should create a file OpenPeep can render

**Step 6: Test doctor**

```bash
node cli/index.js doctor
node cli/index.js doctor --fix
```

**Step 7: Commit**

```bash
git commit -m "test: verify end-to-end npx openpeep flow"
```

---

Plan complete and saved to `docs/plans/2026-03-10-npx-openpeep-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?