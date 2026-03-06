# OpenPeep

**Every file type deserves its own app.**

OpenPeep is a desktop application for viewing and editing any file using custom web apps called **Peeps**. Open a CSV and get a real spreadsheet. Open a project folder and get a kanban board. Each Peep is a full web app (HTML/CSS/JS, any framework) that activates when you open a matching file or folder.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### Setup

```bash
git clone https://github.com/taiso-llc/openpeep.git
cd openpeep
```

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Run uvicorn from the project root so module imports resolve correctly:

```bash
# From the project root:
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend API on `http://localhost:8000`.

### Configuration

Copy the example config and edit it to add your workspace directories:

```bash
cp openpeep.config.example.json openpeep.config.json
```

## Architecture

OpenPeep is split into two parts:

- **Backend** -- FastAPI (Python) server that handles file system access, source/workspace management, and peep discovery. Exposes a REST API under `/api`.
- **Frontend** -- React + Vite + Tailwind CSS app that provides the file browser, board view, settings, and peep rendering. Peeps are loaded in iframes and communicate with the host via the PeepSDK.

### Three-Tier Peep System

Peeps are discovered from three locations, in priority order:

1. **Workspace peeps** -- `<workspace>/.openpeep/peeps/` (project-specific, highest priority)
2. **User peeps** -- `~/.openpeep/peeps/` (installed from PeepHub or user-created)
3. **Built-in peeps** -- shipped with OpenPeep in the `peeps/` directory (text, markdown, HTML, JSON, image, audio, video, 3D model, meeting notes)

A peep declares which file extensions or folder patterns it handles in its `peep.json` manifest. When you open a file, OpenPeep finds the best matching peep and loads it.

### PeepSDK

Every peep includes the PeepSDK (`peeps/_sdk/peep-sdk.js`) via a script tag. The SDK provides:

- `PeepSDK.on('init', callback)` -- receive file content, path, and settings when the peep loads
- `PeepSDK.save(content)` -- write changes back to the file
- `PeepSDK.rawFileUrl(path)` -- get a URL to load binary files (images, audio, video) through the backend
- Theme injection -- the host app pushes CSS variables so peeps match the current theme automatically

## Building Peeps

A peep is a folder containing at minimum an `index.html` and a `peep.json` manifest. You can use vanilla JS, React, Vue, Three.js, D3, Monaco Editor, or any other web technology.

See the built-in peeps in `peeps/` for working examples, and the SDK source at `peeps/_sdk/peep-sdk.js` for the full API.

## Claude Code Plugin

The `@openpeep/claude-code` MCP server enables Claude Code to create, preview, and publish peeps through a conversational workflow. Ask Claude to "build me a recipe viewer" and it will scaffold the peep, let you preview it live in OpenPeep, and iterate on it until it is ready to publish.

## License

MIT License

Copyright (c) 2026 Taiso Labs (taiso.ai)
