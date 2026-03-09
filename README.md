# OpenPeep

**Every file type deserves its own app.**

OpenPeep is a desktop application for viewing and editing any file using custom web apps called **Peeps**. Open a CSV and get a real spreadsheet. Open a project folder and get a kanban board. Each Peep is a full web app (HTML/CSS/JS, any framework) that activates when you open a matching file or folder.

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
