# OpenPeep Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build OpenPeep — a project-based file explorer with a plugin system (Peeps), Spaces, kanban board, and PeepHub marketplace integration.

**Architecture:** Next.js + React 19 + TS frontend talks to a Python/FastAPI local backend. Every file preview runs in an iframe-sandboxed Peep plugin. Projects are organized into Spaces with customizable kanban columns. PeepHub (separate repo) provides the marketplace.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Python 3.11+, FastAPI, uvicorn

**Design doc:** `docs/plans/2026-03-04-openpeep-design.md`

---

## Phase 1: Project Scaffold + Backend Core

### Task 1: Initialize Frontend (Next.js)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/globals.css`

**Step 1: Scaffold Next.js app**

```bash
cd ~/git/taiso/openpeep
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

**Step 2: Verify it runs**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` — should see Next.js default page.

**Step 3: Clean up default content**

Replace `app/page.tsx` with a minimal shell:

```tsx
export default function Home() {
  return (
    <main className="h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">🐥 OpenPeep</h1>
    </main>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend"
```

---

### Task 2: Initialize Backend (FastAPI)

**Files:**
- Create: `backend/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/routers/__init__.py`
- Create: `backend/routers/files.py`

**Step 1: Create requirements.txt**

```
fastapi
uvicorn[standard]
python-multipart
watchfiles
```

**Step 2: Create backend/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import files

app = FastAPI(title="OpenPeep", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
```

**Step 3: Create backend/routers/files.py — minimal**

```python
from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
import json

router = APIRouter()


@router.get("/files")
def list_files(root: str = Query(...), path: str = Query("")):
    """List directory contents."""
    base = Path(root).expanduser().resolve()
    target = (base / path).resolve()

    if not target.is_relative_to(base):
        raise HTTPException(status_code=403, detail="Path traversal denied")

    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    entries = []
    for item in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if item.name.startswith("."):
            continue
        entry = {
            "name": item.name,
            "path": str(item.relative_to(base)),
            "isDir": item.is_dir(),
            "size": item.stat().st_size if item.is_file() else None,
        }
        # Check for project.json in directories
        if item.is_dir():
            pj = item / "project.json"
            if pj.exists():
                try:
                    entry["project"] = json.loads(pj.read_text())
                except Exception:
                    pass
        entries.append(entry)

    return {"entries": entries, "path": path, "root": root}


@router.get("/file")
def read_file(path: str = Query(...)):
    """Read a single file's content."""
    file_path = Path(path).expanduser().resolve()

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Binary files — return metadata only
    binary_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".webm", ".m4v", ".glb", ".gltf", ".usdz"}
    if file_path.suffix.lower() in binary_exts:
        return {
            "path": str(file_path),
            "name": file_path.name,
            "ext": file_path.suffix.lower(),
            "binary": True,
            "size": file_path.stat().st_size,
        }

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {
            "path": str(file_path),
            "name": file_path.name,
            "ext": file_path.suffix.lower(),
            "binary": True,
            "size": file_path.stat().st_size,
        }

    return {
        "path": str(file_path),
        "name": file_path.name,
        "ext": file_path.suffix.lower(),
        "content": content,
        "binary": False,
        "size": file_path.stat().st_size,
    }


@router.post("/file")
def save_file(payload: dict):
    """Save content to a file."""
    file_path = Path(payload["path"]).expanduser().resolve()

    if not file_path.parent.exists():
        raise HTTPException(status_code=404, detail="Parent directory not found")

    file_path.write_text(payload["content"], encoding="utf-8")
    return {"saved": True, "path": str(file_path)}
```

**Step 4: Create backend/routers/__init__.py**

```python
# OpenPeep backend routers
```

**Step 5: Set up venv and install**

```bash
cd ~/git/taiso/openpeep
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

**Step 6: Verify it runs**

```bash
uvicorn backend.main:app --reload --port 8000
```

Test: `curl http://localhost:8000/api/health` → `{"status":"ok","version":"0.1.0"}`

**Step 7: Add .gitignore**

```
# Python
venv/
__pycache__/
*.pyc

# Node
frontend/node_modules/
frontend/.next/

# OS
.DS_Store

# Config (user-specific)
openpeep.config.json
```

**Step 8: Commit**

```bash
git add backend/ .gitignore
git commit -m "feat: scaffold FastAPI backend with files router"
```

---

### Task 3: Config System + Spaces API

**Files:**
- Create: `backend/config.py`
- Create: `backend/routers/sources.py`
- Create: `openpeep.config.example.json`
- Modify: `backend/main.py`

**Step 1: Create openpeep.config.example.json**

```json
{
  "spaces": [
    {
      "name": "My Projects",
      "icon": "📁",
      "roots": ["~/Projects"],
      "statuses": ["Idea", "Planning", "In Progress", "Analyze", "Archive"]
    }
  ],
  "defaultStatuses": ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
  "fileAssociations": {
    "overrides": []
  },
  "peepSettings": {},
  "peephub": {
    "url": "https://api.peephub.ai"
  }
}
```

**Step 2: Create backend/config.py**

```python
from pathlib import Path
import json

CONFIG_PATH = Path(__file__).parent.parent / "openpeep.config.json"
DEFAULT_STATUSES = ["Idea", "Planning", "In Progress", "Analyze", "Archive"]


def load_config() -> dict:
    """Load config, creating from example if missing."""
    if not CONFIG_PATH.exists():
        example = CONFIG_PATH.parent / "openpeep.config.example.json"
        if example.exists():
            CONFIG_PATH.write_text(example.read_text())
        else:
            CONFIG_PATH.write_text(json.dumps({
                "spaces": [],
                "defaultStatuses": DEFAULT_STATUSES,
                "fileAssociations": {"overrides": []},
                "peepSettings": {},
                "peephub": {"url": "https://api.peephub.ai"},
            }, indent=2))

    return json.loads(CONFIG_PATH.read_text())


def save_config(config: dict):
    """Save config to disk."""
    CONFIG_PATH.write_text(json.dumps(config, indent=2))
```

**Step 3: Create backend/routers/sources.py**

```python
from fastapi import APIRouter
from backend.config import load_config, save_config

router = APIRouter()


@router.get("/sources")
def get_sources():
    """Return all configured spaces."""
    config = load_config()
    return {
        "spaces": config.get("spaces", []),
        "defaultStatuses": config.get("defaultStatuses", [
            "Idea", "Planning", "In Progress", "Analyze", "Archive"
        ]),
    }


@router.put("/sources")
def update_sources(payload: dict):
    """Update spaces configuration."""
    config = load_config()
    if "spaces" in payload:
        config["spaces"] = payload["spaces"]
    if "defaultStatuses" in payload:
        config["defaultStatuses"] = payload["defaultStatuses"]
    save_config(config)
    return {"saved": True}
```

**Step 4: Wire into main.py**

Add to `backend/main.py`:
```python
from backend.routers import files, sources

app.include_router(sources.router, prefix="/api")
```

**Step 5: Test**

```bash
curl http://localhost:8000/api/sources
```

Should return spaces from config (or empty array if no config yet).

**Step 6: Commit**

```bash
git add backend/config.py backend/routers/sources.py openpeep.config.example.json
git commit -m "feat: add config system and spaces API"
```

---

### Task 4: Peeps Registry + Static Serving

**Files:**
- Create: `backend/routers/peeps.py`
- Create: `peeps/` directory
- Modify: `backend/main.py`

**Step 1: Create backend/routers/peeps.py**

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import json

router = APIRouter()

PEEPS_DIR = Path(__file__).parent.parent.parent / "peeps"


def scan_peeps() -> list[dict]:
    """Scan peeps/ directory and return all manifests."""
    peeps = []
    if not PEEPS_DIR.exists():
        return peeps

    for folder in sorted(PEEPS_DIR.iterdir()):
        manifest_path = folder / "peep.json"
        if folder.is_dir() and manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text())
                manifest["_path"] = str(folder)
                peeps.append(manifest)
            except Exception:
                pass
    return peeps


@router.get("/peeps")
def list_peeps():
    """Return all installed peep manifests."""
    return {"peeps": scan_peeps()}


@router.get("/peeps/{peep_id}/{file_path:path}")
def serve_peep_file(peep_id: str, file_path: str):
    """Serve static files from a peep's folder."""
    peep_dir = PEEPS_DIR / peep_id
    if not peep_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Peep '{peep_id}' not found")

    target = (peep_dir / file_path).resolve()
    if not target.is_relative_to(peep_dir.resolve()):
        raise HTTPException(status_code=403, detail="Path traversal denied")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Guess content type
    suffix = target.suffix.lower()
    content_types = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
    }
    media_type = content_types.get(suffix, "application/octet-stream")

    return FileResponse(target, media_type=media_type)


@router.delete("/peeps/{peep_id}")
def uninstall_peep(peep_id: str):
    """Uninstall a community peep. Built-ins are protected."""
    peep_dir = PEEPS_DIR / peep_id
    manifest_path = peep_dir / "peep.json"

    if not peep_dir.is_dir() or not manifest_path.exists():
        raise HTTPException(status_code=404, detail=f"Peep '{peep_id}' not found")

    manifest = json.loads(manifest_path.read_text())
    if manifest.get("builtin", False):
        raise HTTPException(status_code=403, detail="Cannot uninstall built-in peeps")

    import shutil
    shutil.rmtree(peep_dir)
    return {"uninstalled": True, "id": peep_id}
```

**Step 2: Wire into main.py**

```python
from backend.routers import files, sources, peeps

app.include_router(peeps.router, prefix="/api")
```

**Step 3: Serve binary files (images/video) from filesystem**

Add to `backend/routers/files.py`:

```python
from fastapi.responses import FileResponse


@router.get("/file/raw")
def serve_raw_file(path: str = Query(...)):
    """Serve a file as-is (for images, video, etc.)."""
    file_path = Path(path).expanduser().resolve()
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
```

**Step 4: Test**

```bash
curl http://localhost:8000/api/peeps
```

Returns `{"peeps": []}` (no peeps installed yet).

**Step 5: Commit**

```bash
git add backend/routers/peeps.py
git commit -m "feat: add peeps registry and static file serving"
```

---

## Phase 2: First Built-in Peep + iframe Bridge

### Task 5: Peep SDK (shared JS for all peeps)

**Files:**
- Create: `peeps/_sdk/peep-sdk.js`

**Step 1: Create the SDK**

This is the JavaScript library that every peep includes. It handles postMessage communication with the host app.

```javascript
/**
 * OpenPeep SDK — include in every peep's index.html
 * <script src="../_sdk/peep-sdk.js"></script>
 */
(function () {
  const PeepSDK = {
    _handlers: {},
    _initData: null,
    _ready: false,

    /** Register a handler for app messages */
    on(event, handler) {
      this._handlers[event] = handler;
    },

    /** Send a message to the host app */
    send(type, payload = {}) {
      window.parent.postMessage({ source: "peep", type, ...payload }, "*");
    },

    /** Tell the app this peep is ready */
    ready() {
      this._ready = true;
      this.send("peep:ready");
    },

    /** Request a file save */
    save(content) {
      this.send("peep:save", { content });
    },

    /** Request a tool run */
    runTool(toolId, args = {}) {
      this.send("peep:run-tool", { toolId, args });
    },

    /** Send verification results */
    verifyResult(errors = [], warnings = []) {
      this.send("peep:verify-result", { errors, warnings });
    },

    /** Request resize */
    resize(height) {
      this.send("peep:resize", { height });
    },

    /** Get the init data (file content, settings, etc.) */
    getInitData() {
      return this._initData;
    },
  };

  // Listen for messages from the host app
  window.addEventListener("message", (event) => {
    const { type, ...payload } = event.data || {};
    if (!type) return;

    if (type === "peep:init") {
      PeepSDK._initData = payload;
      if (PeepSDK._handlers["init"]) {
        PeepSDK._handlers["init"](payload);
      }
    } else if (type === "peep:file-changed") {
      if (PeepSDK._handlers["file-changed"]) {
        PeepSDK._handlers["file-changed"](payload);
      }
    } else if (type === "peep:settings-changed") {
      if (PeepSDK._handlers["settings-changed"]) {
        PeepSDK._handlers["settings-changed"](payload);
      }
    }

    // Generic handler
    if (PeepSDK._handlers[type]) {
      PeepSDK._handlers[type](payload);
    }
  });

  window.PeepSDK = PeepSDK;
})();
```

**Step 2: Commit**

```bash
git add peeps/_sdk/
git commit -m "feat: add PeepSDK for peep-to-app communication"
```

---

### Task 6: Image Viewer Peep (simplest built-in)

**Files:**
- Create: `peeps/image-viewer/peep.json`
- Create: `peeps/image-viewer/index.html`

**Step 1: Create peep.json**

```json
{
  "id": "image-viewer",
  "name": "Image Viewer",
  "version": "1.0.0",
  "description": "Preview images with zoom and fit controls",
  "author": "OpenPeep",
  "entry": "index.html",
  "builtin": true,
  "priority": 0,
  "capabilities": ["view"],
  "matches": {
    "extensions": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"]
  }
}
```

**Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Viewer</title>
  <script src="../_sdk/peep-sdk.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      image-rendering: auto;
    }
    .checkerboard {
      background-image:
        linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
        linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .info {
      position: fixed;
      bottom: 8px;
      right: 12px;
      color: #666;
      font: 12px/1 monospace;
    }
  </style>
</head>
<body>
  <img id="preview" />
  <div class="info" id="info"></div>
  <script>
    PeepSDK.on('init', ({ filePath, ext }) => {
      const img = document.getElementById('preview');
      const info = document.getElementById('info');

      // Load image via backend raw file endpoint
      const backendUrl = 'http://localhost:8000';
      img.src = `${backendUrl}/api/file/raw?path=${encodeURIComponent(filePath)}`;

      // Show transparency checkerboard for PNGs/SVGs
      if (['.png', '.svg', '.webp'].includes(ext)) {
        document.body.classList.add('checkerboard');
      }

      img.onload = () => {
        info.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        PeepSDK.ready();
      };

      img.onerror = () => {
        info.textContent = 'Failed to load image';
        PeepSDK.ready();
      };
    });
  </script>
</body>
</html>
```

**Step 3: Test**

Run backend, hit `http://localhost:8000/api/peeps` — should return `image-viewer` manifest.
Hit `http://localhost:8000/api/peeps/image-viewer/index.html` — should serve the HTML.

**Step 4: Commit**

```bash
git add peeps/image-viewer/
git commit -m "feat: add image-viewer built-in peep"
```

---

### Task 7: Text Editor Peep

**Files:**
- Create: `peeps/text-editor/peep.json`
- Create: `peeps/text-editor/index.html`

**Step 1: Create peep.json**

```json
{
  "id": "text-editor",
  "name": "Text Editor",
  "version": "1.0.0",
  "description": "View and edit text files with syntax hints",
  "author": "OpenPeep",
  "entry": "index.html",
  "builtin": true,
  "priority": 0,
  "capabilities": ["view", "edit", "save"],
  "matches": {
    "extensions": [".txt", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".css", ".scss", ".sh", ".bash", ".py", ".rb", ".go", ".rs", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env", ".log", ".xml", ".sql"]
  }
}
```

**Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Editor</title>
  <script src="../_sdk/peep-sdk.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1e1e1e;
      color: #d4d4d4;
      font: 14px/1.6 'SF Mono', 'Fira Code', 'Consolas', monospace;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: #252526;
      border-bottom: 1px solid #333;
      align-items: center;
    }
    .toolbar button {
      background: #333;
      color: #ccc;
      border: 1px solid #555;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .toolbar button:hover { background: #444; }
    .toolbar button.active { background: #0078d4; border-color: #0078d4; color: #fff; }
    .toolbar .spacer { flex: 1; }
    .toolbar .status { font-size: 11px; color: #888; }
    #editor {
      flex: 1;
      padding: 12px 16px;
      overflow: auto;
      white-space: pre;
      tab-size: 2;
      outline: none;
    }
    #editor[contenteditable="false"] { cursor: default; }
    #editor[contenteditable="true"] {
      cursor: text;
      background: #1a1a2e;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="btn-view" class="active" onclick="setMode('view')">View</button>
    <button id="btn-edit" onclick="setMode('edit')">Edit</button>
    <span class="spacer"></span>
    <span class="status" id="status"></span>
  </div>
  <pre id="editor" contenteditable="false"></pre>
  <script>
    let currentMode = 'view';
    let originalContent = '';
    let saveTimeout = null;

    function setMode(mode) {
      currentMode = mode;
      const editor = document.getElementById('editor');
      const btnView = document.getElementById('btn-view');
      const btnEdit = document.getElementById('btn-edit');

      editor.contentEditable = mode === 'edit' ? 'true' : 'false';
      btnView.classList.toggle('active', mode === 'view');
      btnEdit.classList.toggle('active', mode === 'edit');
    }

    function autoSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const content = document.getElementById('editor').textContent;
        if (content !== originalContent) {
          PeepSDK.save(content);
          document.getElementById('status').textContent = 'Saved';
          setTimeout(() => {
            document.getElementById('status').textContent = '';
          }, 2000);
        }
      }, 1000);
    }

    PeepSDK.on('init', ({ content, fileName }) => {
      originalContent = content || '';
      document.getElementById('editor').textContent = originalContent;
      document.getElementById('status').textContent = fileName;
      PeepSDK.ready();
    });

    PeepSDK.on('file-changed', ({ content }) => {
      if (currentMode === 'view') {
        originalContent = content;
        document.getElementById('editor').textContent = content;
      }
    });

    document.getElementById('editor').addEventListener('input', () => {
      if (currentMode === 'edit') autoSave();
    });
  </script>
</body>
</html>
```

**Step 3: Commit**

```bash
git add peeps/text-editor/
git commit -m "feat: add text-editor built-in peep"
```

---

### Task 8: Markdown Editor Peep

**Files:**
- Create: `peeps/markdown-editor/peep.json`
- Create: `peeps/markdown-editor/index.html`

**Step 1: Create peep.json**

```json
{
  "id": "markdown-editor",
  "name": "Markdown Editor",
  "version": "1.0.0",
  "description": "View and edit Markdown with live preview",
  "author": "OpenPeep",
  "entry": "index.html",
  "builtin": true,
  "priority": 0,
  "capabilities": ["view", "edit", "save"],
  "matches": {
    "extensions": [".md", ".markdown", ".mdx"]
  }
}
```

**Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Editor</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="../_sdk/peep-sdk.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: #252526;
      border-bottom: 1px solid #333;
      align-items: center;
    }
    .toolbar button {
      background: #333;
      color: #ccc;
      border: 1px solid #555;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .toolbar button:hover { background: #444; }
    .toolbar button.active { background: #0078d4; border-color: #0078d4; color: #fff; }
    .toolbar .spacer { flex: 1; }
    .toolbar .status { font-size: 11px; color: #888; }
    .content { flex: 1; overflow: hidden; display: flex; }
    #preview {
      flex: 1;
      padding: 24px 32px;
      overflow-y: auto;
      line-height: 1.7;
    }
    #preview h1, #preview h2, #preview h3 { color: #fff; margin: 1em 0 0.5em; }
    #preview h1 { font-size: 1.8em; border-bottom: 1px solid #333; padding-bottom: 0.3em; }
    #preview h2 { font-size: 1.4em; }
    #preview p { margin: 0.8em 0; }
    #preview code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    #preview pre { background: #2d2d2d; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    #preview pre code { background: none; padding: 0; }
    #preview a { color: #4fc1ff; }
    #preview img { max-width: 100%; border-radius: 4px; }
    #preview blockquote { border-left: 3px solid #555; padding-left: 16px; color: #999; margin: 1em 0; }
    #preview ul, #preview ol { padding-left: 24px; margin: 0.8em 0; }
    #preview table { border-collapse: collapse; margin: 1em 0; width: 100%; }
    #preview th, #preview td { border: 1px solid #444; padding: 8px 12px; text-align: left; }
    #preview th { background: #2d2d2d; }
    #editor-area {
      flex: 1;
      padding: 12px 16px;
      overflow-y: auto;
      white-space: pre-wrap;
      font: 14px/1.6 'SF Mono', 'Fira Code', monospace;
      color: #d4d4d4;
      outline: none;
      display: none;
    }
    .mode-edit #preview { display: none; }
    .mode-edit #editor-area { display: block; }
    .mode-split #preview { width: 50%; border-left: 1px solid #333; }
    .mode-split #editor-area { display: block; width: 50%; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="btn-view" class="active" onclick="setMode('view')">View</button>
    <button id="btn-edit" onclick="setMode('edit')">Edit</button>
    <button id="btn-split" onclick="setMode('split')">Split</button>
    <span class="spacer"></span>
    <span class="status" id="status"></span>
  </div>
  <div class="content" id="content">
    <pre id="editor-area" contenteditable="true"></pre>
    <div id="preview"></div>
  </div>
  <script>
    let currentMode = 'view';
    let rawContent = '';
    let saveTimeout = null;

    function setMode(mode) {
      currentMode = mode;
      document.body.className = `mode-${mode}`;
      document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-${mode}`).classList.add('active');

      if (mode === 'view' || mode === 'split') {
        renderMarkdown();
      }
    }

    function renderMarkdown() {
      const src = currentMode === 'view' ? rawContent : document.getElementById('editor-area').textContent;
      document.getElementById('preview').innerHTML = marked.parse(src || '');
    }

    function autoSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const content = document.getElementById('editor-area').textContent;
        if (content !== rawContent) {
          rawContent = content;
          PeepSDK.save(content);
          document.getElementById('status').textContent = 'Saved';
          setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
        }
      }, 1000);
    }

    PeepSDK.on('init', ({ content, fileName }) => {
      rawContent = content || '';
      document.getElementById('editor-area').textContent = rawContent;
      document.getElementById('status').textContent = fileName;
      setMode('view');
      PeepSDK.ready();
    });

    PeepSDK.on('file-changed', ({ content }) => {
      rawContent = content;
      if (currentMode === 'view') renderMarkdown();
      else if (currentMode === 'split') renderMarkdown();
    });

    document.getElementById('editor-area').addEventListener('input', () => {
      autoSave();
      if (currentMode === 'split') renderMarkdown();
    });
  </script>
</body>
</html>
```

**Step 3: Commit**

```bash
git add peeps/markdown-editor/
git commit -m "feat: add markdown-editor built-in peep"
```

---

### Task 9: Video Player + HTML Preview + JSON Editor Peeps

**Files:**
- Create: `peeps/video-player/peep.json`
- Create: `peeps/video-player/index.html`
- Create: `peeps/html-preview/peep.json`
- Create: `peeps/html-preview/index.html`
- Create: `peeps/json-editor/peep.json`
- Create: `peeps/json-editor/index.html`

These follow the same pattern as the previous peeps. Create `peep.json` manifests and `index.html` entry points for each:

**video-player:** Native `<video>` element, loads from `/api/file/raw`. Capabilities: `["view"]`. Matches: `.mp4, .mov, .webm, .m4v`.

**html-preview:** Loads HTML files in a nested iframe (iframe within the peep iframe — the peep creates an inner iframe pointing to the raw file). Toolbar with Fit Width/Height/Actual Size buttons. Capabilities: `["view"]`. Matches: `.html, .htm`.

**json-editor:** Uses a `<textarea>` with JSON syntax validation. View mode shows formatted JSON, edit mode allows modification with auto-save. Capabilities: `["view", "edit", "save"]`. Matches: `.json` (default fallback for all JSON).

Build each one following the same structure as Tasks 6-8. Keep them simple — these are the baseline built-ins.

**Commit after all three:**

```bash
git add peeps/video-player/ peeps/html-preview/ peeps/json-editor/
git commit -m "feat: add video-player, html-preview, json-editor built-in peeps"
```

---

## Phase 3: Frontend App Shell

### Task 10: Frontend API Client

**Files:**
- Create: `frontend/utils/api.ts`

**Step 1: Create the API client**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
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

export const api = {
  // Sources / Spaces
  getSources: () => fetchJSON<{
    spaces: Space[];
    defaultStatuses: string[];
  }>("/sources"),

  // Files
  listFiles: (root: string, path = "") =>
    fetchJSON<{ entries: FileEntry[] }>(`/files?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}`),

  readFile: (path: string) =>
    fetchJSON<FileData>(`/file?path=${encodeURIComponent(path)}`),

  saveFile: (path: string, content: string) =>
    fetchJSON<{ saved: boolean }>("/file", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  rawFileUrl: (path: string) =>
    `${API_BASE}/file/raw?path=${encodeURIComponent(path)}`,

  // Peeps
  listPeeps: () => fetchJSON<{ peeps: PeepManifest[] }>("/peeps"),

  peepFileUrl: (peepId: string, filePath: string) =>
    `${API_BASE}/peeps/${peepId}/${filePath}`,

  uninstallPeep: (peepId: string) =>
    fetchJSON<{ uninstalled: boolean }>(`/peeps/${peepId}`, { method: "DELETE" }),
};

// Types
export interface Space {
  name: string;
  icon: string;
  roots: string[];
  statuses: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number | null;
  project?: Record<string, unknown>;
}

export interface FileData {
  path: string;
  name: string;
  ext: string;
  content?: string;
  binary: boolean;
  size: number;
}

export interface PeepManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  builtin: boolean;
  priority: number;
  capabilities: string[];
  matches: {
    extensions?: string[];
    fileNames?: string[];
    contentMatch?: Record<string, unknown>;
  };
  bundle?: Record<string, unknown>;
  tools?: Array<{ id: string; label: string; command: string; args: string[] }>;
  settings?: Record<string, unknown>;
  _path?: string;
}
```

**Step 2: Commit**

```bash
git add frontend/utils/
git commit -m "feat: add frontend API client with types"
```

---

### Task 11: Peep Resolver (file → peep matching)

**Files:**
- Create: `frontend/utils/peep-resolver.ts`

**Step 1: Create the resolver**

```typescript
import { PeepManifest, FileData } from "./api";

/**
 * Resolve which peep should handle a given file.
 * Priority: user override > content match > filename > extension
 */
export function resolvePeep(
  file: FileData,
  peeps: PeepManifest[],
  overrides: Array<{ pattern: string; peep: string }> = []
): PeepManifest | null {
  // Level 5: User overrides
  for (const override of overrides) {
    if (matchesPattern(file.name, override.pattern)) {
      const found = peeps.find((p) => p.id === override.peep);
      if (found) return found;
    }
  }

  // Level 3: Content match (highest auto-match)
  const contentMatches = peeps.filter((p) => matchesContent(file, p));
  if (contentMatches.length > 0) {
    return pickBest(contentMatches);
  }

  // Level 2: Filename pattern
  const nameMatches = peeps.filter((p) =>
    (p.matches.fileNames || []).some((pattern) => matchesPattern(file.name, pattern))
  );
  if (nameMatches.length > 0) {
    return pickBest(nameMatches);
  }

  // Level 1: Extension
  const extMatches = peeps.filter((p) =>
    (p.matches.extensions || []).includes(file.ext)
  );
  if (extMatches.length > 0) {
    return pickBest(extMatches);
  }

  return null;
}

/** Pick the peep with highest priority */
function pickBest(peeps: PeepManifest[]): PeepManifest {
  return peeps.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}

/** Simple glob matching (supports * wildcard) */
function matchesPattern(fileName: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    "i"
  );
  return regex.test(fileName);
}

/** Content-based matching */
function matchesContent(file: FileData, peep: PeepManifest): boolean {
  const cm = peep.matches.contentMatch;
  if (!cm || file.binary || !file.content) return false;

  const rules = (cm as { type: string; rules: Array<Record<string, unknown>> }).rules;
  if (!rules) return false;

  const type = (cm as { type: string }).type;

  if (type === "json" && file.ext === ".json") {
    try {
      const data = JSON.parse(file.content);
      return rules.every((rule) => matchJsonRule(data, rule));
    } catch {
      return false;
    }
  }

  if (type === "text") {
    return rules.every((rule) => matchTextRule(file.content!, rule));
  }

  if (type === "html" && file.ext === ".html") {
    return rules.every((rule) => matchHtmlRule(file.content!, rule));
  }

  return false;
}

function matchJsonRule(data: unknown, rule: Record<string, unknown>): boolean {
  const path = rule.path as string;
  if (!path) return false;

  const value = getNestedValue(data, path);

  if ("values" in rule) {
    return (rule.values as string[]).includes(value as string);
  }
  if ("exists" in rule) {
    return rule.exists ? value !== undefined : value === undefined;
  }
  return false;
}

function matchTextRule(content: string, rule: Record<string, unknown>): boolean {
  if ("firstLine" in rule) {
    const firstLine = content.split("\n")[0] || "";
    return new RegExp(rule.firstLine as string).test(firstLine);
  }
  if ("contains" in rule) {
    return content.includes(rule.contains as string);
  }
  return false;
}

function matchHtmlRule(content: string, rule: Record<string, unknown>): boolean {
  if ("meta" in rule) {
    const metaName = rule.meta as string;
    const regex = new RegExp(
      `<meta\\s+name=["']${metaName}["']\\s+content=["']([^"']+)["']`,
      "i"
    );
    const match = content.match(regex);
    if (!match) return false;
    if ("values" in rule) {
      return (rule.values as string[]).includes(match[1]);
    }
    if ("contains" in rule) {
      return match[1].includes(rule.contains as string);
    }
    return true;
  }
  return false;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
```

**Step 2: Commit**

```bash
git add frontend/utils/peep-resolver.ts
git commit -m "feat: add peep resolver with 5-level file matching"
```

---

### Task 12: Preview Pane Component (iframe host)

**Files:**
- Create: `frontend/components/PreviewPane/PreviewPane.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { api, FileData, PeepManifest } from "@/utils/api";

interface PreviewPaneProps {
  file: FileData | null;
  peep: PeepManifest | null;
  onSaveStatus?: (status: string) => void;
}

export default function PreviewPane({ file, peep, onSaveStatus }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send init data to peep when iframe loads
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current || !file || !peep) return;

    const iframe = iframeRef.current;
    iframe.contentWindow?.postMessage(
      {
        type: "peep:init",
        filePath: file.path,
        content: file.content || null,
        fileName: file.name,
        ext: file.ext,
        binary: file.binary,
      },
      "*"
    );
  }, [file, peep]);

  // Listen for messages from the peep iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { source, type, ...payload } = event.data || {};
      if (source !== "peep") return;

      switch (type) {
        case "peep:ready":
          // Peep is rendered
          break;
        case "peep:save":
          if (file) {
            try {
              await api.saveFile(file.path, payload.content);
              onSaveStatus?.("Saved");
            } catch (err) {
              onSaveStatus?.("Save failed");
            }
          }
          break;
        case "peep:run-tool":
          // TODO: proxy to backend tool runner
          console.log("Tool requested:", payload);
          break;
        case "peep:verify-result":
          // TODO: show in status bar
          console.log("Verify:", payload);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [file, onSaveStatus]);

  if (!file || !peep) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <div className="text-4xl mb-2">🐥</div>
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }

  const iframeSrc = api.peepFileUrl(peep.id, peep.entry);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="flex-1 border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`${peep.name}: ${file.name}`}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/PreviewPane/
git commit -m "feat: add PreviewPane iframe host component"
```

---

### Task 13: File Tree Component

**Files:**
- Create: `frontend/components/FileTree/FileTree.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { api, FileEntry } from "@/utils/api";

interface FileTreeProps {
  root: string;
  onFileSelect: (fullPath: string) => void;
  selectedPath?: string;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  expanded?: boolean;
  fullPath: string;
}

export default function FileTree({ root, onFileSelect, selectedPath }: FileTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Load root directory
  useEffect(() => {
    loadDirectory("").then((entries) => setNodes(entries));
  }, [root]);

  const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
          children: entry.isDir ? undefined : undefined,
        }));
      } catch {
        return [];
      }
    },
    [root]
  );

  const toggleDir = useCallback(
    async (node: TreeNode) => {
      const newExpanded = new Set(expandedPaths);
      if (newExpanded.has(node.path)) {
        newExpanded.delete(node.path);
      } else {
        newExpanded.add(node.path);
        if (!node.children) {
          const children = await loadDirectory(node.path);
          setNodes((prev) => updateNodeChildren(prev, node.path, children));
        }
      }
      setExpandedPaths(newExpanded);
    },
    [expandedPaths, loadDirectory]
  );

  const handleClick = (node: TreeNode) => {
    if (node.isDir) {
      toggleDir(node);
    } else {
      onFileSelect(node.fullPath);
    }
  };

  return (
    <div className="text-sm text-zinc-300 overflow-y-auto h-full select-none">
      {nodes.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          expanded={expandedPaths}
          selectedPath={selectedPath}
          onClick={handleClick}
        />
      ))}
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  expanded,
  selectedPath,
  onClick,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedPath?: string;
  onClick: (node: TreeNode) => void;
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = node.fullPath === selectedPath;
  const indent = depth * 16;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-zinc-800 ${
          isSelected ? "bg-zinc-700" : ""
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => onClick(node)}
      >
        <span className="w-4 text-center text-xs text-zinc-500">
          {node.isDir ? (isExpanded ? "▼" : "▶") : ""}
        </span>
        <span className="truncate">
          {node.isDir ? "📁" : fileIcon(node.name)} {node.name}
        </span>
      </div>
      {node.isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    md: "📝", json: "📋", html: "🌐", css: "🎨", js: "📜", ts: "📜",
    py: "🐍", png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", svg: "🖼",
    mp4: "🎬", mov: "🎬", webm: "🎬",
  };
  return icons[ext || ""] || "📄";
}

function updateNodeChildren(
  nodes: TreeNode[],
  targetPath: string,
  children: TreeNode[]
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
    }
    return node;
  });
}
```

**Step 2: Commit**

```bash
git add frontend/components/FileTree/
git commit -m "feat: add FileTree sidebar component"
```

---

### Task 14: Kanban Board Component

**Files:**
- Create: `frontend/components/Board/Board.tsx`
- Create: `frontend/components/Board/ProjectCard.tsx`

**Step 1: Create ProjectCard.tsx**

```tsx
interface ProjectCardProps {
  name: string;
  path: string;
  project?: Record<string, unknown>;
  onClick: () => void;
}

export default function ProjectCard({ name, path, project, onClick }: ProjectCardProps) {
  const description = (project?.description as string) || "";
  const type = (project?.type as string) || "";

  return (
    <div
      className="bg-zinc-800 rounded-lg p-3 cursor-pointer hover:bg-zinc-750 hover:ring-1 hover:ring-zinc-600 transition-all"
      onClick={onClick}
    >
      <h3 className="font-medium text-zinc-200 text-sm truncate">
        {formatProjectName(name)}
      </h3>
      {description && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{description}</p>
      )}
      {type && (
        <span className="inline-block text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded mt-2">
          {type}
        </span>
      )}
    </div>
  );
}

function formatProjectName(folderName: string): string {
  // Strip date prefix: "2026-03-04_my-project" → "My Project"
  const withoutDate = folderName.replace(/^\d{4}-\d{2}-\d{2}_/, "");
  return withoutDate
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
```

**Step 2: Create Board.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { api, Space, FileEntry } from "@/utils/api";
import ProjectCard from "./ProjectCard";

interface BoardProps {
  space: Space;
  onProjectSelect: (root: string, path: string) => void;
}

interface ProjectEntry extends FileEntry {
  status: string;
  root: string;
}

export default function Board({ space, onProjectSelect }: BoardProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    loadProjects();
  }, [space]);

  async function loadProjects() {
    const allProjects: ProjectEntry[] = [];

    for (const root of space.roots) {
      try {
        const { entries } = await api.listFiles(root);
        for (const entry of entries) {
          if (entry.isDir) {
            const status = (entry.project?.status as string) || space.statuses[0] || "Idea";
            allProjects.push({ ...entry, status, root });
          }
        }
      } catch {
        // Root might not exist
      }
    }

    setProjects(allProjects);
  }

  const columns = space.statuses;

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {columns.map((status) => {
        const columnProjects = projects.filter((p) => p.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3 px-1">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                {status}
              </h2>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                {columnProjects.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columnProjects.map((project) => (
                <ProjectCard
                  key={`${project.root}/${project.path}`}
                  name={project.name}
                  path={project.path}
                  project={project.project}
                  onClick={() => onProjectSelect(project.root, project.path)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/components/Board/
git commit -m "feat: add kanban Board with ProjectCard component"
```

---

### Task 15: Space Switcher Component

**Files:**
- Create: `frontend/components/SpaceSwitcher/SpaceSwitcher.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Space } from "@/utils/api";

interface SpaceSwitcherProps {
  spaces: Space[];
  activeSpace: Space | null;
  onSelect: (space: Space | null) => void;
}

export default function SpaceSwitcher({ spaces, activeSpace, onSelect }: SpaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200"
      >
        <span>{activeSpace?.icon || "🌐"}</span>
        <span>{activeSpace?.name || "All Spaces"}</span>
        <span className="text-zinc-500 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {spaces.map((space) => (
            <button
              key={space.name}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 flex items-center gap-2 ${
                activeSpace?.name === space.name ? "bg-zinc-700" : ""
              }`}
              onClick={() => { onSelect(space); setOpen(false); }}
            >
              <span>{space.icon}</span>
              <span className="text-zinc-200">{space.name}</span>
              <span className="text-zinc-500 text-xs ml-auto">{space.roots.length} root{space.roots.length !== 1 ? "s" : ""}</span>
            </button>
          ))}
          <div className="border-t border-zinc-700" />
          <button
            className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 flex items-center gap-2 ${
              !activeSpace ? "bg-zinc-700" : ""
            }`}
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            <span>🌐</span>
            <span className="text-zinc-200">All Spaces</span>
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/SpaceSwitcher/
git commit -m "feat: add SpaceSwitcher dropdown component"
```

---

### Task 16: Wire Up Main Page

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/globals.css`

**Step 1: Update globals.css for dark theme baseline**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  background: #111;
  color: #e4e4e7;
}
```

**Step 2: Rewrite app/page.tsx — the main shell**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Space, FileData, PeepManifest } from "@/utils/api";
import { resolvePeep } from "@/utils/peep-resolver";
import SpaceSwitcher from "@/components/SpaceSwitcher/SpaceSwitcher";
import Board from "@/components/Board/Board";
import FileTree from "@/components/FileTree/FileTree";
import PreviewPane from "@/components/PreviewPane/PreviewPane";

type View = "board" | "browse";

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [view, setView] = useState<View>("board");
  const [saveStatus, setSaveStatus] = useState("");

  // Browse mode state
  const [browseRoot, setBrowseRoot] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [activePeep, setActivePeep] = useState<PeepManifest | null>(null);
  const [selectedPath, setSelectedPath] = useState("");

  // Load spaces and peeps on mount
  useEffect(() => {
    api.getSources().then(({ spaces }) => {
      setSpaces(spaces);
      if (spaces.length > 0) setActiveSpace(spaces[0]);
    });
    api.listPeeps().then(({ peeps }) => setPeeps(peeps));
  }, []);

  // Open a file and resolve its peep
  const openFile = useCallback(
    async (fullPath: string) => {
      setSelectedPath(fullPath);
      try {
        const fileData = await api.readFile(fullPath);
        setSelectedFile(fileData);
        const peep = resolvePeep(fileData, peeps);
        setActivePeep(peep);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [peeps]
  );

  // Enter a project from the board
  const handleProjectSelect = (root: string, path: string) => {
    setBrowseRoot(`${root}/${path}`);
    setView("browse");
  };

  // Determine which space to show
  const displaySpace = activeSpace || (spaces.length > 0 ? {
    name: "All Spaces",
    icon: "🌐",
    roots: spaces.flatMap((s) => s.roots),
    statuses: spaces[0]?.statuses || ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
  } : null);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-lg font-bold">🐥</span>
        <SpaceSwitcher
          spaces={spaces}
          activeSpace={activeSpace}
          onSelect={setActiveSpace}
        />
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex bg-zinc-800 rounded-md overflow-hidden">
          <button
            className={`px-3 py-1 text-xs ${view === "board" ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            onClick={() => setView("board")}
          >
            📋 Board
          </button>
          <button
            className={`px-3 py-1 text-xs ${view === "browse" ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            onClick={() => setView("browse")}
          >
            📁 Browse
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex min-h-0">
        {view === "board" && displaySpace && (
          <Board space={displaySpace} onProjectSelect={handleProjectSelect} />
        )}

        {view === "browse" && (
          <>
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col min-h-0">
              {browseRoot ? (
                <>
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                    <button
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                      onClick={() => { setBrowseRoot(""); setView("board"); }}
                    >
                      ← Back
                    </button>
                    <span className="text-xs text-zinc-400 truncate">
                      {browseRoot.split("/").pop()}
                    </span>
                  </div>
                  <FileTree
                    root={browseRoot}
                    onFileSelect={openFile}
                    selectedPath={selectedPath}
                  />
                </>
              ) : (
                <div className="p-4 text-sm text-zinc-500">
                  Select a project from the board to browse files.
                </div>
              )}
            </aside>

            {/* Preview */}
            <PreviewPane
              file={selectedFile}
              peep={activePeep}
              onSaveStatus={setSaveStatus}
            />
          </>
        )}
      </main>

      {/* Status bar */}
      <footer className="flex items-center px-4 py-1 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
        {activePeep && (
          <span>
            peep: {activePeep.name} v{activePeep.version}
          </span>
        )}
        <span className="flex-1" />
        {saveStatus && <span className="text-green-500">{saveStatus}</span>}
        {selectedFile && <span className="ml-4">{selectedFile.path}</span>}
      </footer>
    </div>
  );
}
```

**Step 3: Verify it works**

Start both servers:
```bash
# Terminal 1
cd ~/git/taiso/openpeep && source venv/bin/activate && uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd ~/git/taiso/openpeep/frontend && npm run dev
```

Open `http://localhost:3000` — should see the OpenPeep shell with Space switcher and Board/Browse toggle.

**Step 4: Commit**

```bash
git add frontend/app/
git commit -m "feat: wire up main app shell with board, file tree, and preview pane"
```

---

## Phase 4: Polish + PeepHub Client

### Task 17: Peep Install from Local Folder

**Files:**
- Modify: `backend/routers/peeps.py`

**Step 1: Add install endpoint**

Add to `peeps.py`:

```python
from fastapi import UploadFile, File
import shutil
import zipfile
import tempfile


@router.post("/peeps/install")
async def install_peep(source: str = None, file: UploadFile = File(None)):
    """Install a peep from a local folder path or a zip upload."""
    if source:
        # Install from local folder
        source_path = Path(source).expanduser().resolve()
        if not source_path.is_dir():
            raise HTTPException(status_code=400, detail="Source is not a directory")

        manifest_path = source_path / "peep.json"
        if not manifest_path.exists():
            raise HTTPException(status_code=400, detail="No peep.json found in source")

        manifest = json.loads(manifest_path.read_text())
        peep_id = manifest.get("id")
        if not peep_id:
            raise HTTPException(status_code=400, detail="Manifest missing 'id' field")

        target = PEEPS_DIR / peep_id
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source_path, target)

        return {"installed": True, "id": peep_id, "name": manifest.get("name")}

    if file:
        # Install from zip upload
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            zip_path = tmp_path / "peep.zip"
            with open(zip_path, "wb") as f:
                f.write(await file.read())

            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(tmp_path / "extracted")

            # Find peep.json in extracted contents
            extracted = tmp_path / "extracted"
            peep_root = None
            for p in extracted.rglob("peep.json"):
                peep_root = p.parent
                break

            if not peep_root:
                raise HTTPException(status_code=400, detail="No peep.json found in zip")

            manifest = json.loads((peep_root / "peep.json").read_text())
            peep_id = manifest.get("id")
            if not peep_id:
                raise HTTPException(status_code=400, detail="Manifest missing 'id'")

            target = PEEPS_DIR / peep_id
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(peep_root, target)

            return {"installed": True, "id": peep_id, "name": manifest.get("name")}

    raise HTTPException(status_code=400, detail="Provide either 'source' path or zip file")
```

**Step 2: Commit**

```bash
git add backend/routers/peeps.py
git commit -m "feat: add peep install from local folder or zip upload"
```

---

### Task 18: PeepHub Client UI (placeholder)

**Files:**
- Create: `frontend/components/PeepHub/PeepHub.tsx`
- Modify: `frontend/app/page.tsx` — add PeepHub button to toolbar

**Step 1: Create PeepHub.tsx**

A modal that shows installed peeps for now. PeepHub marketplace browsing will connect to the real API once `peephub` repo exists.

```tsx
"use client";

import { useState, useEffect } from "react";
import { api, PeepManifest } from "@/utils/api";

interface PeepHubProps {
  open: boolean;
  onClose: () => void;
}

export default function PeepHub({ open, onClose }: PeepHubProps) {
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [tab, setTab] = useState<"installed" | "browse">("installed");

  useEffect(() => {
    if (open) {
      api.listPeeps().then(({ peeps }) => setPeeps(peeps));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800">
          <span className="text-lg font-bold">🐥 PeepHub</span>
          <div className="flex ml-4 bg-zinc-800 rounded-md overflow-hidden">
            <button
              className={`px-3 py-1 text-xs ${tab === "installed" ? "bg-zinc-600 text-white" : "text-zinc-400"}`}
              onClick={() => setTab("installed")}
            >
              Installed
            </button>
            <button
              className={`px-3 py-1 text-xs ${tab === "browse" ? "bg-zinc-600 text-white" : "text-zinc-400"}`}
              onClick={() => setTab("browse")}
            >
              Browse
            </button>
          </div>
          <span className="flex-1" />
          <button className="text-zinc-500 hover:text-zinc-300" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "installed" && (
            <div className="grid gap-3">
              {peeps.map((peep) => (
                <div
                  key={peep.id}
                  className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3"
                >
                  <div className="text-2xl">🐥</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-200">{peep.name}</div>
                    <div className="text-xs text-zinc-500">
                      v{peep.version} · {peep.author}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">{peep.description}</div>
                  </div>
                  <div>
                    {peep.builtin ? (
                      <span className="text-[10px] bg-zinc-700 text-zinc-500 px-2 py-0.5 rounded">
                        Built-in
                      </span>
                    ) : (
                      <button
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={async () => {
                          await api.uninstallPeep(peep.id);
                          setPeeps((prev) => prev.filter((p) => p.id !== peep.id));
                        }}
                      >
                        Uninstall
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "browse" && (
            <div className="text-center text-zinc-500 py-12">
              <div className="text-3xl mb-2">🐥</div>
              <p className="text-sm">PeepHub marketplace coming soon</p>
              <p className="text-xs text-zinc-600 mt-1">Connect to peephub.ai to browse community peeps</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add PeepHub button to page.tsx toolbar**

In the toolbar section of `page.tsx`, add:
```tsx
<button
  className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md"
  onClick={() => setPeepHubOpen(true)}
>
  🐥 PeepHub
</button>
```

Add state: `const [peepHubOpen, setPeepHubOpen] = useState(false);`
Add component: `<PeepHub open={peepHubOpen} onClose={() => setPeepHubOpen(false)} />`

**Step 3: Commit**

```bash
git add frontend/components/PeepHub/
git commit -m "feat: add PeepHub client UI with installed peeps view"
```

---

### Task 19: Settings Page (Spaces + File Associations)

**Files:**
- Create: `frontend/app/settings/page.tsx`

This is a lower priority. Create a basic settings page at `/settings` with:
- Spaces editor (add/remove/reorder spaces, edit roots and statuses per space)
- File associations editor (add/remove user overrides)
- PeepHub URL configuration

Use standard form inputs and the `/api/sources` PUT endpoint to save changes.

**Commit:**

```bash
git add frontend/app/settings/
git commit -m "feat: add settings page for spaces and file associations"
```

---

### Task 20: Create Peep Scaffolding Tool

**Files:**
- Create: `scripts/create-peep.js`

**Step 1: Create the scaffolding script**

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const peepId = process.argv[2];
if (!peepId) {
  console.error("Usage: node scripts/create-peep.js <peep-id>");
  console.error("Example: node scripts/create-peep.js csv-viewer");
  process.exit(1);
}

const peepDir = path.join(__dirname, "..", "peeps", peepId);

if (fs.existsSync(peepDir)) {
  console.error(`Error: peeps/${peepId}/ already exists`);
  process.exit(1);
}

fs.mkdirSync(peepDir, { recursive: true });

// peep.json
fs.writeFileSync(
  path.join(peepDir, "peep.json"),
  JSON.stringify(
    {
      id: peepId,
      name: peepId
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      version: "0.1.0",
      description: "A custom OpenPeep viewer",
      author: "You",
      entry: "index.html",
      builtin: false,
      priority: 10,
      capabilities: ["view"],
      matches: {
        extensions: [],
        fileNames: [],
      },
    },
    null,
    2
  )
);

// index.html
fs.writeFileSync(
  path.join(peepDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${peepId}</title>
  <script src="../_sdk/peep-sdk.js"><\/script>
  <link rel="stylesheet" href="peep.css">
</head>
<body>
  <div id="root">
    <p>Hello from ${peepId}!</p>
  </div>
  <script src="peep.js"><\/script>
</body>
</html>
`
);

// peep.js
fs.writeFileSync(
  path.join(peepDir, "peep.js"),
  `// ${peepId} peep logic
PeepSDK.on('init', ({ filePath, content, fileName, ext }) => {
  console.log('${peepId} loaded:', fileName);

  // Render your preview here
  document.getElementById('root').innerHTML = \`
    <h2>\${fileName}</h2>
    <pre>\${content ? content.slice(0, 500) : '(binary file)'}</pre>
  \`;

  PeepSDK.ready();
});
`
);

// peep.css
fs.writeFileSync(
  path.join(peepDir, "peep.css"),
  `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 16px;
}
`
);

// README.md
fs.writeFileSync(
  path.join(peepDir, "README.md"),
  `# ${peepId}

A custom peep for OpenPeep.

## Development

1. Edit \`peep.json\` to set your file matching rules
2. Build your UI in \`index.html\`
3. Use \`PeepSDK\` to communicate with the host app
4. Test by opening matching files in OpenPeep
`
);

console.log(`Created peeps/${peepId}/`);
console.log(`  peep.json    — manifest (edit matches + capabilities)`);
console.log(`  index.html   — entry point`);
console.log(`  peep.js      — logic`);
console.log(`  peep.css     — styles`);
console.log(`  README.md    — docs`);
console.log(`\nNext: edit peep.json to add your file matching rules.`);
```

**Step 2: Commit**

```bash
git add scripts/
git commit -m "feat: add create-peep scaffolding tool"
```

---

### Task 21: Final Wiring + README

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

**Step 1: Create README.md**

```markdown
# 🐥 OpenPeep

A project-based file explorer where every file gets a rich, interactive preview. Built around **Peeps** — modular plugins that can view, edit, generate, verify, and recognize file bundles.

## Quick Start

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Configuration

Copy the example config and edit your spaces:
```bash
cp openpeep.config.example.json openpeep.config.json
```

## Creating a Peep

```bash
node scripts/create-peep.js my-csv-viewer
```

See `docs/PEEP_DEV_GUIDE.md` for the full guide.

## Architecture

See `docs/plans/2026-03-04-openpeep-design.md` for the complete design document.
```

**Step 2: Create CLAUDE.md**

```markdown
# OpenPeep

## Development Commands

### Backend (FastAPI)
```bash
uvicorn backend.main:app --reload --port 8000
pip install -r backend/requirements.txt
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev    # dev server on :3000
npm run build  # production build
npm run lint   # eslint
```

## Architecture

- **Frontend:** Next.js + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Python FastAPI (local only — filesystem + peep management)
- **Peeps:** Plugin system — each peep is a folder in `peeps/` with a `peep.json` manifest and `index.html` entry point
- **Isolation:** Every peep runs in an iframe with postMessage communication
- **PeepHub:** Separate marketplace service (not in this repo)

## Key Files

- `backend/main.py` — FastAPI app entry
- `backend/routers/files.py` — Filesystem API
- `backend/routers/peeps.py` — Peep registry + install/uninstall
- `backend/config.py` — Config loading/saving
- `frontend/app/page.tsx` — Main app shell
- `frontend/utils/api.ts` — API client
- `frontend/utils/peep-resolver.ts` — File → peep matching logic
- `peeps/_sdk/peep-sdk.js` — Shared SDK for all peeps
- `peeps/*/peep.json` — Peep manifests

## Design Doc

Full design: `docs/plans/2026-03-04-openpeep-design.md`
```

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "feat: add README and CLAUDE.md"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| **1: Scaffold** | Tasks 1-4 | Next.js frontend, FastAPI backend, config system, peeps registry |
| **2: First Peeps** | Tasks 5-9 | PeepSDK, 6 built-in peeps (image, text, markdown, video, html, json) |
| **3: App Shell** | Tasks 10-16 | API client, peep resolver, preview pane, file tree, kanban board, space switcher, main page |
| **4: Polish** | Tasks 17-21 | Peep install, PeepHub client UI, settings, scaffolding tool, docs |

Total: **21 tasks**, roughly **4 phases**, building from backend → peeps → frontend → polish.
