# npx openpeep — Install & Onboarding Design

**Date:** 2026-03-09
**Goal:** One-command install experience that sets up OpenPeep, walks users through what it does via progressive sample files, installs the Claude Code MCP plugin, and provides lifecycle/diagnostic commands.

## Package Structure

```
openpeep (npm package)
  cli/
    index.js          ← entry point (npx openpeep), detects first-run vs subsequent
    wizard.js         ← interactive onboarding prompts
    claude-plugin.js  ← detects ~/.claude.json, injects MCP server config
    doctor.js         ← deep inspection + auto-repair
    daemon.js         ← background process management (start/stop/restart/status)
  backend/            ← Python source (current backend/ code, bundled)
  frontend/dist/      ← pre-built React app (served by FastAPI as static files)
  samples/
    1-basics/         ← .txt, .png, .jpg, .pdf, .mp3
    2-structured/     ← .md, .json, .csv
    3-custom-types/   ← .mn, .slides.md, custom DSL JSONs
    4-bundles/        ← folder-level peeps
    START-HERE.md     ← suggested Claude Code prompts
  package.json        ← bin: { "openpeep": "cli/index.js" }
```

## CLI Commands

Five commands total. No more.

```
npx openpeep              ← start (+ wizard on first run)
npx openpeep stop         ← stop the background server
npx openpeep restart      ← restart
npx openpeep status       ← is it running? what port? what version?
npx openpeep doctor       ← deep inspection + auto-repair
```

## First-Run Flow

CLI checks for `~/.openpeep/`. Not found → runs wizard.

```
$ npx openpeep

  ┌─────────────────────────────────────┐
  │  Welcome to OpenPeep v0.1.0        │
  └─────────────────────────────────────┘

  Checking requirements...
  ✓ Node.js 22.1.0
  ✓ Python 3.12.4
  ⠋ Creating Python environment...
  ✓ Backend ready

  Where do you keep your projects?
  > ~/Projects

  Setting up demo workspace with sample files...
  ✓ ~/.openpeep/demo/ created
    ├── 1-basics/        (txt, png, jpg, pdf, mp3)
    ├── 2-structured/    (md, json, csv)
    ├── 3-custom-types/  (meeting notes, slides, DSLs)
    ├── 4-bundles/       (folder-level peeps)
    └── START-HERE.md

  Install Claude Code plugin? (Y/n) Y
  ✓ Added OpenPeep MCP server to Claude Code

  Starting OpenPeep → http://localhost:3000 (pid 42391)

  ──────────────────────────────────────
  Try these in Claude Code:

  1. "create a meeting notes file for tomorrow's standup"
  2. "make a slide deck about our Q1 results"
  3. "create a CSV tracking my monthly expenses"
  4. "create a json config for a new project"

  OpenPeep will preview them live!
  ──────────────────────────────────────
```

## Subsequent Runs

```
$ npx openpeep
  ✓ OpenPeep running → http://localhost:3000 (pid 42391)
```

Detects `~/.openpeep/` exists, skips wizard, starts server as background daemon, returns terminal.

## Sample Files — Progressive Complexity

The demo workspace teaches users what OpenPeep does through escalating file types. No tutorial needed — the folder structure IS the tutorial.

### Level 1: Basics (`1-basics/`)
Files the user already knows. Shows that OpenPeep gives them real viewers instead of raw text.
- `hello.txt` — text viewer
- `photo.png`, `photo.jpg` — image viewer
- `document.pdf` — PDF viewer
- `track.mp3` — audio player with waveform

### Level 2: Structured (`2-structured/`)
Files they know, but OpenPeep gives them rich editors.
- `notes.md` — markdown editor with live preview
- `config.json` — JSON editor with syntax highlighting + validation
- `data.csv` — spreadsheet viewer with sorting/filtering

### Level 3: Custom Types (`3-custom-types/`)
DSL files that map to purpose-built apps. Shows the power of custom file associations.
- `standup.mn` — meeting notes with attendees, agenda, action items
- `pitch.slides.md` — slide deck presentation
- Custom JSON schemas (e.g., `recipe.recipe.json`, `workout.workout.json`)

### Level 4: Bundles (`4-bundles/`)
Folder-level peeps — an entire folder becomes an app.
- A project folder that opens as a kanban board
- A data folder that opens as a dashboard

### START-HERE.md
Opens in the markdown viewer. Contains:
- "Welcome to OpenPeep" intro
- Explanation of the 4 levels
- Suggested Claude Code prompts to try
- Link to docs for creating custom peeps (advanced)

## Server Architecture

### Background Daemon
- `npx openpeep` spawns FastAPI backend as a detached child process
- PID written to `~/.openpeep/openpeep.pid`
- Logs written to `~/.openpeep/logs/`
- FastAPI serves both the API and pre-built frontend static files on port 3000
- `--foreground` flag available for debugging (logs to stdout, Ctrl+C to stop)

### How It Works
1. CLI reads `~/.openpeep/config.json`
2. Activates `~/.openpeep/venv/` Python environment
3. Starts `uvicorn backend.main:app --port 3000` as background process
4. Opens browser to `http://localhost:3000`
5. Returns terminal to user

## Claude Code MCP Plugin

### Installation
Onboarding wizard detects `~/.claude.json` and adds MCP server entry after user confirmation:

```json
{
  "mcpServers": {
    "openpeep": {
      "command": "openpeep-mcp",
      "args": []
    }
  }
}
```

### MCP Tools (progressive)
Basic tools (for creating files that peeps render):
- `list_peeps` — what viewers/editors are available and what file types they handle
- `create_file` — create a file that a peep can render (the main user workflow)
- `preview_file` — get URL to see it in OpenPeep

Advanced tools (for building custom peeps):
- `create_peep` — scaffold a new peep (peep.json + index.html + samples/)
- `publish_peep` — publish a peep to PeepHub

## Doctor — Deep Inspection + Auto-Repair

```
$ npx openpeep doctor

  OpenPeep Doctor v0.1.0
  ─────────────────────────────────────

  Runtime
  ✓ Node.js 22.1.0 (min: 20.0)
  ✓ Python 3.12.4 (min: 3.11)
  ✓ pip 24.0

  Environment
  ✓ Venv: ~/.openpeep/venv/ (healthy, 12 packages)
  ✓ Config: ~/.openpeep/config.json
  ✓ Data dir: ~/.openpeep/ (142 MB)
  ✓ Port 3000: available

  Peeps
  ✓ 8 built-in peeps loaded
  ✓ 3 installed peeps (from PeepHub)
  ✗ Project peep "my-viewer" has invalid peep.json
    → Missing "match" field. Run: openpeep doctor --fix

  Workspaces
  ✓ ~/Projects (2 sources, 47 files)
  ✗ ~/Old-Work — directory not found
    → Remove from config? (Y/n)

  Claude Code Integration
  ✓ Claude Code detected (~/.claude.json)
  ✓ OpenPeep MCP server registered
  ✗ MCP server not responding — stale path?
    → Reinstall plugin? (Y/n)

  PeepHub
  ✓ Connected to peephub.taiso.ai
  ✗ API key not set (publish won't work)
    → Set in OpenPeep Settings or: openpeep config set peephub.apiKey <key>

  Network
  ✓ peephub.taiso.ai reachable
  ✓ openpeep.taiso.ai reachable

  ─────────────────────────────────────
  3 issues found. Run "openpeep doctor --fix" to auto-repair.
```

### Doctor Sections
- **Runtime** — Node.js version, Python version, pip
- **Environment** — venv health, config validity, disk usage, port availability
- **Peeps** — built-in/installed/project peep validation, peep.json schema checks
- **Workspaces** — verify all configured directories exist and are accessible
- **Claude Code Integration** — plugin installed? MCP server responding? config valid?
- **PeepHub** — connectivity, API key status, auth status
- **Network** — reachability of external services

### --fix Flag
Auto-repairs what it can:
- Recreate broken venv
- Remove missing workspace dirs from config
- Reinstall Claude Code MCP server entry
- Fix invalid peep.json fields where possible
- Interactive confirmation for destructive changes

## What Changes From Current Repo

- **Backend**: FastAPI serves pre-built frontend as static files (no separate Vite dev server in prod)
- **Build pipeline**: `npm run build` creates frontend dist AND packages Python backend
- **Publishing**: `npm publish` pushes the complete package to npm
- **Config location**: moves from `./openpeep.config.json` (repo-local) to `~/.openpeep/config.json` (global)
- **Venv location**: moves from `./venv/` (repo-local) to `~/.openpeep/venv/` (global)
- **Dev mode**: `npm run dev` still works as today for contributors (separate Vite + uvicorn)

## Prerequisites for Users

- Node.js 20+
- Python 3.11+
- That's it.
