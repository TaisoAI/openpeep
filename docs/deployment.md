# OpenPeep — Deployment

OpenPeep is a desktop application (local backend + web frontend). It runs on the user's machine — not deployed to a server.

## Architecture

```
Browser (localhost:5173) → Vite dev server (frontend)
                         → FastAPI (localhost:8000/api) → local filesystem
```

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
- **Backend:** FastAPI (Python) + Uvicorn
- **Data:** Local filesystem — reads/writes files directly, config stored in `openpeep.config.json`
- **Peeps:** Sandboxed HTML apps served from `peeps/` directories, rendered in iframes

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **npm** 9+

## Setup (First Time)

```bash
# Clone the repo
git clone git@github.com:TaisoAI/openpeep.git
cd openpeep

# Install everything (creates venv, installs pip + npm deps)
npm run setup

# Copy config
cp .env.example .env
cp openpeep.config.example.json openpeep.config.json
```

Edit `openpeep.config.json` to point `roots` at your actual project folders.

## Running

```bash
# Start both backend and frontend
npm run dev
```

This runs concurrently:
- **Backend:** `uvicorn backend.main:app --reload --port 8000`
- **Frontend:** `cd frontend && npm run dev` (Vite on port 5173)

Open `http://localhost:5173` in your browser.

## Individual Services

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

## Building for Production

```bash
# Build frontend static assets
npm run build
```

Output goes to `frontend/dist/`. The backend serves these in production mode.

## Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend API port |
| `VITE_API_URL` | `http://localhost:8000/api` | API URL for frontend |

### App Config (`openpeep.config.json`)

| Key | Description |
|-----|-------------|
| `spaces` | Workspace definitions (name, icon, roots, statuses) |
| `defaultStatuses` | Default Kanban columns for new spaces |
| `theme` | `{ mode: "dark"/"light"/"auto", style: "macos"/"windows"/"linux" }` |
| `showHiddenFiles` | Show dotfiles in file tree |
| `devMode` | Enable developer features |
| `peephub.url` | PeepHub API endpoint |
| `peephub.apiKey` | PeepHub API key for publishing |

### Peep Directories (Three-Tier)

| Tier | Path | Priority |
|------|------|----------|
| Built-in | `<app>/peeps/` | Lowest |
| Installed | `~/.openpeep/peeps/` | Middle |
| Project | `<workspace-root>/peeps/` | Highest |

Higher tiers shadow lower tiers by peep `id`.

## Dependencies

### Backend (`backend/requirements.txt`)

- `fastapi` — API framework
- `uvicorn[standard]` — ASGI server
- `python-multipart` — File upload support
- `watchfiles` — Hot reload

### Frontend (`frontend/package.json`)

- `react` + `react-dom` — UI framework
- `vite` — Build tool + dev server
- `tailwindcss` v4 — Styling
- `lucide-react` — Icons

## Related Repos

| Repo | Purpose | Deploy Docs |
|------|---------|-------------|
| [openpeep](https://github.com/TaisoAI/openpeep) | Main app (this repo) | This file |
| [openpeep_www](https://github.com/TaisoAI/openpeep_www) | Marketing site | `docs/deployment.md` |
| [peephub](https://github.com/TaisoAI/peephub) | Peep marketplace | `docs/deployment.md` |

All three share the same Lightsail instance (`supereasy`) for web-facing deployments. OpenPeep itself runs locally.

## Future: Packaged Desktop App

OpenPeep is currently run from source. Future distribution options:
- **Electron/Tauri** wrapper for native desktop app
- **Homebrew tap** for macOS
- **pip install** for the backend + pre-built frontend assets
