# OpenPeep — Design Document

**Date:** 2026-03-04
**Status:** Approved

---

## Overview

OpenPeep is a project-based file explorer where every file gets a rich, interactive preview. It's built around a plugin system called **Peeps** — modular content type handlers that can view, edit, generate, verify, and recognize file bundles.

**Mascot:** A baby chick named Peep with oversized round glasses and squinty eyes.

**Companion project:** PeepHub (`peephub.ai`) — a separate marketplace service for discovering and sharing community peeps.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + React 19 + TypeScript |
| Backend (local) | Python / FastAPI |
| Styling | Tailwind CSS |
| Plugin isolation | iframe + postMessage bridge |
| Marketplace | PeepHub (separate repo, AWS-hosted) |

Matches the OpenClaw/SuperTuber ecosystem stack.

---

## Repos

| Repo | Purpose |
|------|---------|
| `openpeep` | The app — frontend, local backend, built-in peeps |
| `peephub` | The marketplace service — API, web storefront, plugin hosting (separate repo, separate deploy) |

---

## Project Structure

```
openpeep/
├── frontend/                    # Next.js + React 19 + TypeScript
│   ├── app/                     # Next.js app router
│   ├── components/
│   │   ├── Board/               # Kanban project board (home screen)
│   │   ├── FileTree/            # Sidebar file tree
│   │   ├── PreviewPane/         # Peep iframe host
│   │   ├── Toolbar/             # Top bar (search, spaces, settings)
│   │   ├── PeepHub/             # Marketplace browser UI
│   │   ├── Settings/            # File associations, peep manager, spaces
│   │   └── SpaceSwitcher/       # Space dropdown
│   ├── hooks/
│   ├── utils/
│   └── public/
│
├── backend/                     # Python FastAPI (local only)
│   ├── main.py
│   ├── routers/
│   │   ├── files.py             # Filesystem access (list, read, write)
│   │   ├── peeps.py             # Local peep management (scan, install, uninstall)
│   │   ├── bundles.py           # Bundle detection / folder scanning
│   │   └── tools.py             # Execute peep tools server-side
│   └── requirements.txt
│
├── peeps/                       # Built-in + installed peeps
│   ├── image-viewer/
│   ├── markdown-editor/
│   ├── video-player/
│   ├── text-editor/
│   ├── json-editor/
│   ├── html-preview/
│   └── ...
│
├── docs/
│   ├── plans/
│   ├── ARCHITECTURE.md
│   └── PEEP_DEV_GUIDE.md
│
└── openpeep.config.json         # Spaces, file associations, settings
```

---

## Spaces

Spaces are top-level organizational contexts — different aspects of a user's life (companies, hobbies, side projects, etc.). Each space maps to one or more source root folders and has its own kanban columns.

```json
{
  "spaces": [
    {
      "name": "HTT",
      "icon": "🎬",
      "roots": ["~/Git/htt/Dailies/content"],
      "statuses": ["Idea", "Scripting", "Filming", "Editing", "Published"]
    },
    {
      "name": "Taiso",
      "icon": "🚀",
      "roots": ["~/git/taiso/"],
      "statuses": ["Backlog", "In Progress", "Review", "Shipped"]
    }
  ]
}
```

**Default statuses for new spaces:**
```
Idea → Planning → In Progress → Analyze → Archive
```

Switching spaces filters the kanban board and file tree to just that space's roots. "All Spaces" shows everything.

---

## Home Screen: Kanban Board

The landing view is a project pipeline board — not a file tree. Projects are cards organized by status columns.

```
┌─────────────────────────────────────────────────────────────┐
│  🐥 OpenPeep   [HTT ▼]  [🔍 Search]  [📋 Board │ 📁]  [⚙] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Idea            Planning         In Progress               │
│  ────            ────────         ───────────               │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │ iPhone 17e│   │ March Evt │   │ Foldables │             │
│  │ Poll Week │   │ Week      │   │ EP1       │             │
│  └───────────┘   └───────────┘   └───────────┘             │
│                                                             │
│  Analyze         Archive                                    │
│  ───────         ───────                                    │
│  ┌───────────┐   ┌───────────┐                              │
│  │ Powerbeats│   │ Old vids  │                              │
│  │ Review    │   │           │                              │
│  └───────────┘   └───────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

- Status comes from `project.json` → `status` field
- Drag between columns updates the status
- Click a project card → enters project view (file tree + preview pane)
- Toggle between Board and Browse (file tree) views

---

## What Is a Peep?

A Peep is a **content type handler** — not just a file viewer. It has five capabilities:

| Capability | What it does | Example |
|-----------|-------------|---------|
| **View** | Render a preview | Image viewer shows a PNG |
| **Edit** | Modify + save | Markdown editor with live preview |
| **Tools** | Generate / transform / export | Poll peep runs `generate-poll` to create PNGs |
| **Verify** | Validate structure, give AI feedback | Poll peep checks image sizes, caption length, required fields |
| **Bundle** | Claim a folder pattern, not just a file | Shorts Series peep recognizes `scripts/ + assets/ + exports/` as one unit |

### Peep Folder Structure

Each peep is a self-contained folder:

```
peeps/markdown-editor/
├── peep.json          # Manifest
├── index.html         # Entry point (loaded in iframe)
├── peep.js            # Logic
├── peep.css           # Styles
├── icon.svg           # Marketplace icon
└── README.md          # Docs for PeepHub
```

### peep.json Manifest

```json
{
  "id": "poll-studio",
  "name": "Poll Studio",
  "version": "1.0.0",
  "description": "Create and preview YouTube Community polls",
  "author": "OpenPeep",
  "icon": "icon.svg",
  "entry": "index.html",
  "builtin": true,
  "priority": 0,

  "capabilities": ["view", "edit", "tools", "verify"],

  "matches": {
    "extensions": [".json"],
    "fileNames": ["poll*-config.json", "quiz*-config.json"],
    "contentMatch": {
      "type": "json",
      "rules": [
        { "path": "type", "values": ["poll", "quiz"] }
      ]
    }
  },

  "bundle": {
    "requires": ["poll*-config.json"],
    "expects": ["assets/", "exports/youtube/"],
    "claimsFolder": true
  },

  "tools": [
    {
      "id": "generate",
      "label": "Generate Images",
      "command": "generate-poll",
      "args": ["{{configPath}}"]
    }
  ],

  "verify": {
    "schema": "poll-config-schema.json",
    "rules": ["all-options-have-images", "caption-under-500", "images-are-1080x1080"]
  },

  "settings": {
    "theme": { "type": "select", "options": ["light", "dark", "auto"], "default": "auto" },
    "fontSize": { "type": "number", "min": 10, "max": 32, "default": 14 }
  }
}
```

---

## Plugin Isolation: iframe + postMessage

Every peep (built-in and community) runs in an iframe. Full DOM and CSS isolation. Communication via postMessage bridge.

### Message Protocol

**App → Peep:**

| Message | Payload | When |
|---------|---------|------|
| `peep:init` | `{ filePath, content, fileName, ext, bundle?, settings }` | File/project opened |
| `peep:file-changed` | `{ content }` | External edit detected |
| `peep:settings-changed` | `{ settings }` | User changed peep settings |

**Peep → App:**

| Message | Payload | When |
|---------|---------|------|
| `peep:ready` | `{}` | Peep finished rendering |
| `peep:save` | `{ content }` | User edited, wants to save |
| `peep:run-tool` | `{ toolId, args }` | User clicked a tool button |
| `peep:verify-result` | `{ errors[], warnings[] }` | Verification complete |
| `peep:resize` | `{ height }` | Peep wants to resize |

---

## File Association Matching

Five levels of matching, most specific wins:

### Level 1: Extension (lowest priority)
```json
{ "extensions": [".md", ".markdown", ".mdx"] }
```

### Level 2: File name pattern
Glob patterns on the filename.
```json
{ "fileNames": ["schedule.json", "poll*-config.json"] }
```

### Level 3: Content match
Inspect file contents. Different strategies per file type:

**JSON — field path + value:**
```json
{
  "contentMatch": {
    "type": "json",
    "rules": [
      { "path": "type", "values": ["poll", "quiz"] },
      { "path": "options[0].image", "exists": true }
    ]
  }
}
```

**Text/Markdown — first line / content patterns:**
```json
{
  "contentMatch": {
    "type": "text",
    "rules": [
      { "firstLine": "^---" },
      { "contains": "layout: storyboard" }
    ]
  }
}
```

**HTML — meta tags:**
```json
{
  "contentMatch": {
    "type": "html",
    "rules": [
      { "meta": "asset-type", "values": ["shorts", "poll"] }
    ]
  }
}
```

**Binary — magic bytes:**
```json
{
  "contentMatch": {
    "type": "binary",
    "magic": "47 4C 54 46"
  }
}
```

### Level 4: Bundle match
Claims an entire folder based on its structure.
```json
{
  "bundle": {
    "requires": ["poll*-config.json"],
    "expects": ["assets/", "exports/youtube/"],
    "claimsFolder": true
  }
}
```

### Level 5: User override (highest priority)
Explicit rules in Settings > File Associations.
```json
{
  "overrides": [
    { "pattern": "*.csv", "peep": "csv-viewer" },
    { "pattern": "schedule.json", "peep": "calendar-pro" },
    { "pattern": "*.json[type=poll]", "peep": "poll-studio" }
  ]
}
```

### Resolution Flow

```
File opened: "poll3-iphone-config.json"
     │
     ├─ Level 5: User override?                      → No
     ├─ Level 4: Parent folder claimed by bundle?     → No
     ├─ Level 3: JSON content → type === "poll"       → poll-studio ✓
     ├─ Level 2: Filename "poll*-config.json"         → poll-studio ✓
     ├─ Level 1: Extension ".json"                    → json-editor ✓
     │
     Result: Level 3 wins → poll-studio
```

When multiple peeps match at the same level, `priority` breaks the tie (installed peeps default to 10, built-in default to 0). If still tied, most recently installed wins.

---

## App Layout

```
┌──────────────────────────────────────────────────────┐
│  Toolbar  [Space ▼] [🔍] [📋 Board │ 📁 Browse] [⚙] │
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│   Sidebar      │         Preview Pane                │
│                │                                     │
│  File Tree     │    ┌─────────────────────────┐      │
│  (or project   │    │                         │      │
│   list when    │    │   Peep iframe            │      │
│   in board     │    │                         │      │
│   view)        │    └─────────────────────────┘      │
│                │    [Peep Toolbar: Save│Generate│...] │
│                │                                     │
├────────────────┴─────────────────────────────────────┤
│  Status Bar   peep: poll-studio v1.0  │ 0 errors     │
└──────────────────────────────────────────────────────┘
```

**Sidebar:** File tree within a project, or project list when browsing a space.
**Preview Pane:** iframe hosting the active peep.
**Peep Toolbar:** Populated by the peep's declared tools + standard actions (save, verify).
**Status Bar:** Active peep name/version, verify results, file path.

---

## Backend API (FastAPI — Local)

```
GET  /api/sources                      # configured spaces + roots
GET  /api/files?root=...&path=...      # list directory
GET  /api/file?path=...                # read file content
POST /api/file                         # save file { path, content }

GET  /api/peeps                        # all installed peeps (manifests)
GET  /api/peeps/{id}/*                 # serve peep static files
POST /api/peeps/install                # install from zip/folder/PeepHub
DELETE /api/peeps/{id}                 # uninstall (guard built-ins)

GET  /api/bundles?root=...&path=...    # scan folder for bundle matches

POST /api/tools/run                    # execute a peep tool server-side
                                       # { toolId, command, args, cwd }
```

Tools run server-side because they need filesystem access (generating images, running Playwright captures, etc.).

---

## PeepHub Integration

OpenPeep has a PeepHub **client** — a UI to browse, search, and install community peeps. All marketplace logic lives in PeepHub's repo.

```
┌─────────────────────────────────────────────────────────┐
│  🐥 PeepHub                              [✕ Close]     │
├──────────┬──────────────────────────────────────────────┤
│          │  🔍 Search peeps...                          │
│ All      │                                              │
│ Editors  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ Viewers  │  │ CSV      │ │ Diagram │ │ Audio   │       │
│ Tools    │  │ Viewer   │ │ Editor  │ │ Player  │       │
│ Bundles  │  │ ⬇ 2.4k  │ │ ⬇ 1.1k │ │ ⬇ 890  │       │
│          │  │[Install] │ │[Install]│ │[Installed]│     │
│ Installed│  └─────────┘ └─────────┘ └─────────┘       │
└──────────┴──────────────────────────────────────────────┘
```

**Install flow:**
1. User clicks Install in PeepHub UI
2. Frontend → local backend: `POST /api/peeps/install { peephubId: "csv-viewer" }`
3. Local backend downloads zip from PeepHub CDN, extracts to `peeps/csv-viewer/`
4. Peep immediately available — no restart

**Frontend calls PeepHub API directly** (`api.peephub.ai`) for browsing/search. Local backend handles the actual install/uninstall.

---

## Built-in Peeps (v1)

| Peep | Matches | Capabilities |
|------|---------|-------------|
| `image-viewer` | .png, .jpg, .gif, .webp, .svg | view |
| `video-player` | .mp4, .mov, .webm, .m4v | view |
| `text-editor` | .txt, .js, .css, .sh, .py, .ts | view, edit, save |
| `markdown-editor` | .md, .markdown, .mdx | view, edit, save |
| `json-editor` | .json (default) | view, edit, save |
| `html-preview` | .html | view |

These ship with OpenPeep. Community peeps and domain-specific peeps (poll-studio, schedule-view, episode-planner, etc.) are installed from PeepHub or locally.

---

## Configuration File

`openpeep.config.json` at project root:

```json
{
  "spaces": [
    {
      "name": "HTT",
      "icon": "🎬",
      "roots": ["~/Git/htt/Dailies/content"],
      "statuses": ["Idea", "Scripting", "Filming", "Editing", "Published"]
    }
  ],
  "defaultStatuses": ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
  "fileAssociations": {
    "overrides": []
  },
  "peepSettings": {
    "markdown-editor": { "theme": "dark", "fontSize": 16 }
  },
  "peephub": {
    "url": "https://api.peephub.ai"
  }
}
```

---

## What We're NOT Doing Yet

- PeepHub service (separate repo, separate timeline)
- Full Finder replacement (file operations, drag-drop, rename, delete)
- Plugin sandboxing / security scanning
- Paid peeps / revenue share
- Desktop app packaging (Electron/Tauri)
- Mobile support
- AI assistant integration
