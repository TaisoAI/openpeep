# Project Viewer, Sort Options, Hidden Files — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three file browser enhancements: a built-in pretty viewer for project.json, sort options in the FileTree, and a show-hidden-files toggle in Settings.

**Architecture:** Each feature touches backend (`files.py`, `sources.py`) and frontend (`FileTree.tsx`, `PreviewPane.tsx`, `Settings.tsx`, `api.ts`, `page.tsx`). Features are independent and can be implemented in parallel worktrees.

**Tech Stack:** Python/FastAPI backend, React/TypeScript/Vite frontend, Tailwind CSS

**Design Doc:** `docs/plans/2026-03-05-project-viewer-sort-hidden-design.md`

---

## Feature A: Show Hidden Files Toggle

### Task A1: Backend — Add showHidden query param to /api/files

**Files:**
- Modify: `backend/routers/files.py:63-97`

**Step 1: Add showHidden parameter to list_files**

In `backend/routers/files.py`, modify the `list_files` function signature and filtering logic:

```python
@router.get("/files")
def list_files(root: str = Query(...), path: str = Query(""), showHidden: bool = Query(False)):
    """List directory contents."""
    base = Path(root).expanduser().resolve()
    target = (base / path).resolve()

    if not target.is_relative_to(base):
        raise HTTPException(status_code=403, detail="Path traversal denied")

    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    entries = []
    for item in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if not showHidden and item.name.startswith("."):
            continue
        entry = {
            "name": item.name,
            "path": str(item.relative_to(base)),
            "isDir": item.is_dir(),
            "size": item.stat().st_size if item.is_file() else None,
        }
        if item.is_dir():
            entry["createdAt"] = _get_folder_created(item)
            entry["lastModified"] = _get_folder_last_modified(item)
            pj = item / "project.json"
            if pj.exists():
                try:
                    entry["project"] = json.loads(pj.read_text())
                except Exception:
                    pass
        entries.append(entry)

    return {"entries": entries, "path": path, "root": root}
```

**Step 2: Test manually**

Run: `curl "http://localhost:8000/api/files?root=/path/to/test&showHidden=true"`
Expected: Response includes dotfiles/dotfolders.

Run: `curl "http://localhost:8000/api/files?root=/path/to/test"`
Expected: Response excludes dotfiles (default behavior preserved).

**Step 3: Commit**

```bash
git add backend/routers/files.py
git commit -m "feat: add showHidden query param to /api/files endpoint"
```

---

### Task A2: Backend — Add showHiddenFiles to config via /api/sources

**Files:**
- Modify: `backend/routers/sources.py:7-17` (get_sources)
- Modify: `backend/routers/sources.py:20-31` (update_sources)

**Step 1: Return showHiddenFiles in get_sources**

```python
@router.get("/sources")
def get_sources():
    """Return all configured spaces and theme."""
    config = load_config()
    return {
        "spaces": config.get("spaces", []),
        "defaultStatuses": config.get("defaultStatuses", [
            "Idea", "Planning", "In Progress", "Analyze", "Archive"
        ]),
        "theme": config.get("theme", {"mode": "dark", "style": "macos"}),
        "showHiddenFiles": config.get("showHiddenFiles", False),
    }
```

**Step 2: Handle showHiddenFiles in update_sources**

Add to the `update_sources` function body, after the theme block:

```python
    if "showHiddenFiles" in payload:
        config["showHiddenFiles"] = payload["showHiddenFiles"]
```

**Step 3: Commit**

```bash
git add backend/routers/sources.py
git commit -m "feat: persist showHiddenFiles setting in config"
```

---

### Task A3: Frontend — Add showHiddenFiles to API types and client

**Files:**
- Modify: `frontend/src/utils/api.ts`

**Step 1: Update getSources return type**

Change the `getSources` return type (line 18-22) to include `showHiddenFiles`:

```typescript
  getSources: () =>
    fetchJSON<{
      spaces: Space[];
      defaultStatuses: string[];
      theme: ThemeConfig;
      showHiddenFiles: boolean;
    }>("/sources"),
```

**Step 2: Update listFiles to accept showHidden**

Change `listFiles` (line 35-38):

```typescript
  listFiles: (root: string, path = "", showHidden = false) =>
    fetchJSON<{ entries: FileEntry[] }>(
      `/files?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}&showHidden=${showHidden}`
    ),
```

**Step 3: Commit**

```bash
git add frontend/src/utils/api.ts
git commit -m "feat: add showHiddenFiles to API client types"
```

---

### Task A4: Frontend — Add toggle to Settings modal

**Files:**
- Modify: `frontend/src/components/Settings/Settings.tsx`

**Step 1: Update Settings props and state**

Add `showHiddenFiles` and `onShowHiddenFilesChanged` to the props interface:

```typescript
interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onSpacesChanged: () => void;
  theme: ThemeConfig;
  onThemeChanged: (theme: ThemeConfig) => void;
  showHiddenFiles: boolean;
  onShowHiddenFilesChanged: (show: boolean) => void;
}
```

Update the function signature and destructuring to include the new props.

**Step 2: Add the toggle UI in the "general" tab**

After the "Show Logo" toggle block (after line 275), add a new section:

```tsx
              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  File Browser
                </h3>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                  <span className="text-[13px] text-primary flex-1 font-medium">
                    Show Hidden Files
                  </span>
                  <button
                    className={`w-9 h-5 rounded-full transition-all relative ${
                      showHiddenFiles
                        ? "bg-accent"
                        : "bg-elevated border border-border-subtle"
                    }`}
                    onClick={async () => {
                      const next = !showHiddenFiles;
                      await api.updateSources({ showHiddenFiles: next });
                      onShowHiddenFilesChanged(next);
                    }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        showHiddenFiles ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
```

**Step 3: Commit**

```bash
git add frontend/src/components/Settings/Settings.tsx
git commit -m "feat: add show hidden files toggle to Settings"
```

---

### Task A5: Frontend — Wire showHiddenFiles through page.tsx and FileTree

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/FileTree/FileTree.tsx`

**Step 1: Add state to page.tsx**

Add state after the theme state (around line 30):

```typescript
const [showHiddenFiles, setShowHiddenFiles] = useState(false);
```

Load from sources in the `Promise.all` callback (around line 93), after setting theme:

```typescript
setShowHiddenFiles(data.showHiddenFiles || false);
```

Wait — sources are loaded via `loadSources()`. Update `loadSources` to also return `showHiddenFiles`, or read it in the main `Promise.all`. The simplest: in the existing `.then()` block around line 93, the `loadSources` call returns spaces. Instead, modify the `Promise.all` to also read `showHiddenFiles` from the sources response. Since `loadSources` calls `api.getSources()`, we can get it from there.

Actually, the cleanest approach: update the `.then()` block. `loadSources` currently only returns `data.spaces`. Change `loadSources` to also return showHiddenFiles:

In `loadSources` callback (line 43-48):
```typescript
const loadSources = useCallback(async () => {
    const data = await api.getSources();
    setSpaces(data.spaces);
    setTheme(data.theme || { mode: "dark", style: "macos" });
    setShowHiddenFiles(data.showHiddenFiles || false);
    return data.spaces;
  }, []);
```

**Step 2: Pass showHiddenFiles to FileTree**

Update the `<FileTree>` usage (around line 310):

```tsx
<FileTree
  root={browseRoot}
  onFileSelect={openFile}
  selectedPath={selectedPath}
  showHidden={showHiddenFiles}
  onFileDeleted={...}
  onFileRenamed={...}
/>
```

Pass to Settings (around line 358):

```tsx
<Settings
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  onSpacesChanged={handleSpacesChanged}
  theme={theme}
  onThemeChanged={setTheme}
  showHiddenFiles={showHiddenFiles}
  onShowHiddenFilesChanged={setShowHiddenFiles}
/>
```

**Step 3: Update FileTree to use showHidden**

In `frontend/src/components/FileTree/FileTree.tsx`:

Add `showHidden?: boolean` to the `FileTreeProps` interface (line 5-11):

```typescript
interface FileTreeProps {
  root: string;
  onFileSelect: (fullPath: string) => void;
  selectedPath?: string;
  showHidden?: boolean;
  onFileDeleted?: (path: string) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
}
```

Destructure it in the component (line 40-46):

```typescript
export default function FileTree({
  root,
  onFileSelect,
  selectedPath,
  showHidden = false,
  onFileDeleted,
  onFileRenamed,
}: FileTreeProps) {
```

Update `loadDirectory` to pass `showHidden` (line 53-66):

```typescript
const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path, showHidden);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
        }));
      } catch {
        return [];
      }
    },
    [root, showHidden]
  );
```

Add `showHidden` to the `useEffect` dependency that reloads the root directory (line 68-70):

```typescript
useEffect(() => {
    loadDirectory("").then((entries) => setNodes(entries));
  }, [root, loadDirectory]);
```

This already depends on `loadDirectory` which now depends on `showHidden`, so the tree will reload when the toggle changes.

**Step 4: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/FileTree/FileTree.tsx
git commit -m "feat: wire showHiddenFiles through app to FileTree"
```

---

## Feature B: File Browser Sort Options

### Task B1: Backend — Add sort and sortDir params to /api/files

**Files:**
- Modify: `backend/routers/files.py:63-97`

**Step 1: Update list_files with sort parameters**

Replace the sort logic in `list_files`. The current `sorted()` on line 76 sorts by `(not x.is_dir(), x.name.lower())`. Replace the function:

```python
@router.get("/files")
def list_files(
    root: str = Query(...),
    path: str = Query(""),
    showHidden: bool = Query(False),
    sort: str = Query("name"),
    sortDir: str = Query(""),
):
    """List directory contents."""
    base = Path(root).expanduser().resolve()
    target = (base / path).resolve()

    if not target.is_relative_to(base):
        raise HTTPException(status_code=403, detail="Path traversal denied")

    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    entries = []
    for item in target.iterdir():
        if not showHidden and item.name.startswith("."):
            continue
        entry = {
            "name": item.name,
            "path": str(item.relative_to(base)),
            "isDir": item.is_dir(),
            "size": item.stat().st_size if item.is_file() else None,
        }
        if item.is_dir():
            entry["createdAt"] = _get_folder_created(item)
            entry["lastModified"] = _get_folder_last_modified(item)
            pj = item / "project.json"
            if pj.exists():
                try:
                    entry["project"] = json.loads(pj.read_text())
                except Exception:
                    pass
        entries.append(entry)

    # Default sort direction: asc for name/type, desc for date/size
    if not sortDir:
        sortDir = "desc" if sort in ("modified", "created", "size") else "asc"
    reverse = sortDir == "desc"

    def sort_key(e):
        if sort == "modified":
            return e.get("lastModified") or ""
        elif sort == "created":
            return e.get("createdAt") or ""
        elif sort == "size":
            return e.get("size") or 0
        elif sort == "type":
            name = e["name"]
            dot = name.rfind(".")
            return name[dot:].lower() if dot > 0 else ""
        else:  # name
            return e["name"].lower()

    # Separate dirs and files, sort each group independently
    dirs = sorted([e for e in entries if e["isDir"]], key=sort_key, reverse=reverse)
    files = sorted([e for e in entries if not e["isDir"]], key=sort_key, reverse=reverse)

    return {"entries": dirs + files, "path": path, "root": root}
```

**Step 2: Test manually**

Run: `curl "http://localhost:8000/api/files?root=/path&sort=modified&sortDir=desc"`
Expected: Entries sorted by lastModified, newest first. Dirs still come first.

Run: `curl "http://localhost:8000/api/files?root=/path&sort=size"`
Expected: Sorted by size, largest first (default desc for size).

**Step 3: Commit**

```bash
git add backend/routers/files.py
git commit -m "feat: add sort and sortDir params to /api/files"
```

---

### Task B2: Frontend — Update API client for sort params

**Files:**
- Modify: `frontend/src/utils/api.ts`

**Step 1: Add sort types and update listFiles**

Add a type for sort options near the other types (after line 132):

```typescript
export type FileSortField = "name" | "modified" | "created" | "size" | "type";
export type SortDirection = "asc" | "desc";
```

Update `listFiles` (already modified in Task A3):

```typescript
  listFiles: (root: string, path = "", showHidden = false, sort: FileSortField = "name", sortDir?: SortDirection) => {
    let url = `/files?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}&showHidden=${showHidden}&sort=${sort}`;
    if (sortDir) url += `&sortDir=${sortDir}`;
    return fetchJSON<{ entries: FileEntry[] }>(url);
  },
```

**Step 2: Commit**

```bash
git add frontend/src/utils/api.ts
git commit -m "feat: add sort params to listFiles API client"
```

---

### Task B3: Frontend — Add sort dropdown to FileTree

**Files:**
- Modify: `frontend/src/components/FileTree/FileTree.tsx`

**Step 1: Add sort state and import types**

Update the import from api.ts (line 3):

```typescript
import { api, FileEntry, FileSortField, SortDirection } from "@/utils/api";
```

Add sort state inside the `FileTree` component, after the existing `useState` calls (after line 51):

```typescript
const [sortField, setSortField] = useState<FileSortField>("name");
const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
const [showSortMenu, setShowSortMenu] = useState(false);
const sortButtonRef = useRef<HTMLButtonElement>(null);
```

**Step 2: Update loadDirectory to pass sort params**

Update the `loadDirectory` callback (modified in Task A5) to include sort:

```typescript
const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path, showHidden, sortField, sortDir);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
        }));
      } catch {
        return [];
      }
    },
    [root, showHidden, sortField, sortDir]
  );
```

**Step 3: Add sort toggle handler**

```typescript
const handleSortSelect = useCallback((field: FileSortField) => {
    if (field === sortField) {
      // Toggle direction
      const defaultDir = (field === "modified" || field === "created" || field === "size") ? "desc" : "asc";
      const currentDir = sortDir || defaultDir;
      setSortDir(currentDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(undefined); // Use default
    }
    setShowSortMenu(false);
  }, [sortField, sortDir]);
```

**Step 4: Add sort button and dropdown to the component render**

Wrap the existing tree content. Replace the return statement (line 174-207):

```tsx
const SORT_OPTIONS: { field: FileSortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "modified", label: "Date Modified" },
    { field: "created", label: "Date Created" },
    { field: "size", label: "Size" },
    { field: "type", label: "Type" },
  ];

  const currentSortDir = sortDir || ((sortField === "modified" || sortField === "created" || sortField === "size") ? "desc" : "asc");

  return (
    <div className="flex flex-col h-full">
      {/* Sort header */}
      <div className="flex items-center px-2 py-1.5 border-b border-border-subtle shrink-0">
        <span className="text-[10px] text-tertiary uppercase tracking-wider font-semibold flex-1">Files</span>
        <div className="relative">
          <button
            ref={sortButtonRef}
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort files"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M9 18h6" />
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-7 w-40 modal-glass z-50 p-1 animate-scale-in">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.field}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-md flex items-center gap-2 transition-colors ${
                    sortField === opt.field
                      ? "text-accent bg-accent/10"
                      : "text-secondary hover:bg-hover hover:text-primary"
                  }`}
                  onClick={() => handleSortSelect(opt.field)}
                >
                  <span className="flex-1">{opt.label}</span>
                  {sortField === opt.field && (
                    <span className="text-[9px] text-tertiary">
                      {currentSortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tree content */}
      <div className="text-xs overflow-y-auto flex-1 select-none py-1">
        {nodes.map((node) => (
          <TreeNodeView
            key={node.path}
            node={node}
            depth={0}
            expanded={expandedPaths}
            selectedPath={selectedPath}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameCommit={commitRename}
            onRenameCancel={() => setRenamingPath(null)}
          />
        ))}

        {contextMenu &&
          createPortal(
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              node={contextMenu.node}
              onClose={() => setContextMenu(null)}
              onDelete={handleDelete}
              onRename={handleRename}
              onCopyPath={handleCopyPath}
            />,
            document.body
          )}
      </div>
    </div>
  );
```

**Step 5: Close sort menu on outside click**

Add this effect after the sort state declarations:

```typescript
useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortButtonRef.current && !sortButtonRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSortMenu]);
```

**Step 6: Commit**

```bash
git add frontend/src/components/FileTree/FileTree.tsx
git commit -m "feat: add sort dropdown to FileTree header"
```

---

## Feature C: project.json Pretty Viewer

### Task C1: Create ProjectViewer component

**Files:**
- Create: `frontend/src/components/ProjectViewer/ProjectViewer.tsx`

**Step 1: Create the component**

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/api";

interface ProjectViewerProps {
  filePath: string;
  onSaveStatus?: (status: string) => void;
  statuses?: string[];
}

interface ProjectData {
  status?: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
}

const KNOWN_FIELDS = ["status", "description", "type"];

export default function ProjectViewer({ filePath, onSaveStatus, statuses = [] }: ProjectViewerProps) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    api.readFile(filePath).then((fileData) => {
      if (fileData.content) {
        try {
          setData(JSON.parse(fileData.content));
        } catch {
          setData(null);
        }
      }
    });
  }, [filePath]);

  const save = useCallback(async (updated: ProjectData) => {
    try {
      await api.saveFile(filePath, JSON.stringify(updated, null, 2));
      setData(updated);
      onSaveStatus?.("Saved");
    } catch {
      onSaveStatus?.("Save failed");
    }
  }, [filePath, onSaveStatus]);

  const handleFieldSave = useCallback((field: string) => {
    if (!data || editing !== field) return;
    const updated = { ...data, [field]: editValue };
    save(updated);
    setEditing(null);
  }, [data, editing, editValue, save]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!data) return;
    save({ ...data, status: newStatus });
  }, [data, save]);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-tertiary">Loading project metadata...</p>
      </div>
    );
  }

  const extraFields = Object.entries(data).filter(
    ([key]) => !KNOWN_FIELDS.includes(key)
  );

  return (
    <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-lg space-y-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-[10px] text-tertiary uppercase tracking-wider font-semibold mb-1">
            Project Metadata
          </div>
          <div className="text-xs text-tertiary font-mono">{filePath.split("/").pop()}</div>
        </div>

        {/* Status */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(statuses.length > 0 ? statuses : ["Idea", "Planning", "In Progress", "Analyze", "Archive"]).map((s) => (
              <button
                key={s}
                className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  data.status === s
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-elevated border border-border-subtle text-secondary hover:text-primary hover:border-border"
                }`}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Description
          </label>
          {editing === "description" ? (
            <textarea
              className="w-full bg-elevated border border-accent/50 rounded-lg px-3 py-2 text-[13px] text-primary mt-2 outline-none resize-none min-h-[80px]"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleFieldSave("description");
                if (e.key === "Escape") setEditing(null);
              }}
              onBlur={() => handleFieldSave("description")}
              autoFocus
            />
          ) : (
            <p
              className="text-[13px] text-secondary mt-2 cursor-pointer hover:text-primary transition-colors min-h-[24px]"
              onClick={() => { setEditing("description"); setEditValue(data.description || ""); }}
            >
              {data.description || <span className="text-tertiary italic">Click to add description...</span>}
            </p>
          )}
        </div>

        {/* Type */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Type
          </label>
          {editing === "type" ? (
            <input
              className="w-full bg-elevated border border-accent/50 rounded-lg px-3 py-1.5 text-[13px] text-primary mt-2 outline-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFieldSave("type");
                if (e.key === "Escape") setEditing(null);
              }}
              onBlur={() => handleFieldSave("type")}
              autoFocus
            />
          ) : (
            <p
              className="text-[13px] text-secondary mt-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setEditing("type"); setEditValue(data.type || ""); }}
            >
              {data.type || <span className="text-tertiary italic">Click to set type...</span>}
            </p>
          )}
        </div>

        {/* Extra fields (read-only display) */}
        {extraFields.length > 0 && (
          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
              Other Fields
            </label>
            <div className="space-y-2 mt-2">
              {extraFields.map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[11px] text-tertiary font-mono shrink-0">{key}:</span>
                  <span className="text-[11px] text-secondary font-mono break-all">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ProjectViewer/ProjectViewer.tsx
git commit -m "feat: create ProjectViewer component for project.json"
```

---

### Task C2: Wire ProjectViewer into PreviewPane

**Files:**
- Modify: `frontend/src/components/PreviewPane/PreviewPane.tsx`
- Modify: `frontend/src/app/page.tsx`

**Step 1: Update PreviewPane to check for project.json**

Add import at top of PreviewPane.tsx:

```typescript
import ProjectViewer from "@/components/ProjectViewer/ProjectViewer";
```

Add `statuses` to the PreviewPaneProps interface:

```typescript
interface PreviewPaneProps {
  file: FileData | null;
  peep: PeepManifest | null;
  onSaveStatus?: (status: string) => void;
  statuses?: string[];
}
```

Destructure `statuses` in the component:

```typescript
export default function PreviewPane({
  file,
  peep,
  onSaveStatus,
  statuses,
}: PreviewPaneProps) {
```

Add a check before the existing peep/iframe rendering. Replace the block starting at line 106 (`if (!file || !peep)`) through the end of the component:

```tsx
  // No file selected — show placeholder
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img
            src="/peep-icon.png"
            alt=""
            className="w-12 h-12 mx-auto mb-3 opacity-15"
          />
          <p className="text-xs text-tertiary">Select a file to preview</p>
        </div>
      </div>
    );
  }

  // project.json — use built-in ProjectViewer
  if (file.name === "project.json") {
    return (
      <ProjectViewer
        filePath={file.path}
        onSaveStatus={onSaveStatus}
        statuses={statuses}
      />
    );
  }

  // No peep matched — show placeholder
  if (!peep) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img
            src="/peep-icon.png"
            alt=""
            className="w-12 h-12 mx-auto mb-3 opacity-15"
          />
          <p className="text-xs text-tertiary">No viewer available for this file type</p>
        </div>
      </div>
    );
  }

  const iframeSrc = api.peepFileUrl(peep.id, peep.entry);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <iframe
        key={peep.id}
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="flex-1 border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`${peep.name}: ${file.name}`}
      />
    </div>
  );
```

**Step 2: Pass statuses from page.tsx to PreviewPane**

In `page.tsx`, update the PreviewPane usage (around line 330):

```tsx
<PreviewPane
  file={selectedFile}
  peep={activePeep}
  onSaveStatus={setSaveStatus}
  statuses={displaySpace?.statuses}
/>
```

**Step 3: Commit**

```bash
git add frontend/src/components/PreviewPane/PreviewPane.tsx frontend/src/app/page.tsx
git commit -m "feat: render ProjectViewer for project.json in PreviewPane"
```

---

## Parallel Execution Strategy

These three features are independent and can be executed in separate worktrees:

| Worktree | Branch | Tasks |
|----------|--------|-------|
| `.worktrees/hidden-files` | `feat/show-hidden-files` | A1, A2, A3, A4, A5 |
| `.worktrees/sort-files` | `feat/sort-files` | B1, B2, B3 |
| `.worktrees/project-viewer` | `feat/project-viewer` | C1, C2 |

**Merge order:** A and B both modify `files.py` and `api.ts`, so merge A first, then resolve B's conflicts (they're in different parts of the same functions). C is fully independent.

**Note:** Tasks A3 and B2 both modify `api.ts:listFiles`. If running in parallel, B2 should be based on A3's changes (or conflicts resolved at merge time — they affect the same function signature).
