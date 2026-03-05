from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import json
import subprocess
import sys
import time
import os

router = APIRouter()

# Cache for last-modified scans: {folder_path: (scan_time, iso_string)}
_last_modified_cache: dict[str, tuple[float, str | None]] = {}
_CACHE_TTL = 60  # seconds


def _get_folder_created(folder: Path) -> str | None:
    """Get folder creation date (birthtime on macOS, fallback to mtime)."""
    try:
        st = folder.stat()
        ts = getattr(st, "st_birthtime", None) or st.st_mtime
        from datetime import datetime, timezone
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except Exception:
        return None


def _get_folder_last_modified(folder: Path) -> str | None:
    """Get the most recent file modification time in a folder (cached)."""
    key = str(folder)
    now = time.time()
    cached = _last_modified_cache.get(key)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]

    latest = 0.0
    try:
        for root, _dirs, files in os.walk(folder):
            # Skip hidden dirs
            _dirs[:] = [d for d in _dirs if not d.startswith(".")]
            for f in files:
                if f.startswith("."):
                    continue
                try:
                    mt = os.path.getmtime(os.path.join(root, f))
                    if mt > latest:
                        latest = mt
                except OSError:
                    continue
    except OSError:
        pass

    if latest > 0:
        from datetime import datetime, timezone
        result = datetime.fromtimestamp(latest, tz=timezone.utc).isoformat()
    else:
        result = None

    _last_modified_cache[key] = (now, result)
    return result


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
        st = item.stat()
        entry = {
            "name": item.name,
            "path": str(item.relative_to(base)),
            "isDir": item.is_dir(),
            "size": st.st_size if item.is_file() else None,
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
        else:
            # File dates
            from datetime import datetime, timezone
            birth = getattr(st, "st_birthtime", None) or st.st_mtime
            entry["createdAt"] = datetime.fromtimestamp(birth, tz=timezone.utc).isoformat()
            entry["lastModified"] = datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()
        entries.append(entry)

    return {"entries": entries, "path": path, "root": root}


@router.get("/file")
def read_file(path: str = Query(...)):
    """Read a single file's content."""
    file_path = Path(path).expanduser().resolve()

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Binary files — return metadata only
    binary_exts = {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif", ".avif", ".bmp", ".tiff", ".tif", ".ico",
        ".mp4", ".mov", ".webm", ".m4v", ".mkv", ".avi", ".ogv", ".3gp",
        ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".aiff", ".aif", ".opus",
        ".glb", ".gltf", ".usdz", ".usd", ".usda", ".usdc", ".obj", ".fbx", ".stl", ".3ds", ".dae",
    }
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


@router.put("/project-status")
def update_project_status(payload: dict):
    """Update a project's status in its project.json."""
    root = payload.get("root", "")
    project_path = payload.get("path", "")
    status = payload.get("status", "")

    base = Path(root).expanduser().resolve()
    project_dir = (base / project_path).resolve()

    if not project_dir.is_relative_to(base):
        raise HTTPException(status_code=403, detail="Path traversal denied")
    if not project_dir.is_dir():
        raise HTTPException(status_code=404, detail="Project directory not found")

    pj_file = project_dir / "project.json"
    project_data = {}
    if pj_file.exists():
        try:
            project_data = json.loads(pj_file.read_text())
        except Exception:
            pass

    project_data["status"] = status
    pj_file.write_text(json.dumps(project_data, indent=2))
    return {"saved": True, "status": status}


@router.delete("/file")
def delete_file(path: str = Query(...)):
    """Delete a file or folder."""
    file_path = Path(path).expanduser().resolve()

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    import shutil
    if file_path.is_dir():
        shutil.rmtree(file_path)
    else:
        file_path.unlink()

    return {"deleted": True, "path": str(file_path)}


@router.put("/file/rename")
def rename_file(payload: dict):
    """Rename a file or folder (same directory)."""
    old_path = Path(payload["path"]).expanduser().resolve()
    new_name = payload.get("newName", "").strip()

    if not old_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not new_name or "/" in new_name or "\\" in new_name or ".." in new_name:
        raise HTTPException(status_code=400, detail="Invalid name")

    new_path = old_path.parent / new_name
    if new_path.exists():
        raise HTTPException(status_code=409, detail="A file with that name already exists")

    old_path.rename(new_path)
    return {"renamed": True, "oldPath": str(old_path), "newPath": str(new_path)}


@router.get("/pick-folder")
def pick_folder():
    """Open a native OS folder picker dialog and return the selected path."""
    import platform
    system = platform.system()

    try:
        if system == "Darwin":
            # macOS — use native AppleScript dialog
            result = subprocess.run(
                ["osascript", "-e",
                 'POSIX path of (choose folder with prompt "Select a root folder")'],
                capture_output=True, text=True, timeout=120,
            )
            folder = result.stdout.strip().rstrip("/")
        elif system == "Windows":
            # Windows — use PowerShell folder browser
            ps_script = (
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
                "$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                "$d.Description = 'Select a root folder'; "
                "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath } else { '' }"
            )
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True, text=True, timeout=120,
            )
            folder = result.stdout.strip()
        else:
            # Linux — use zenity
            result = subprocess.run(
                ["zenity", "--file-selection", "--directory",
                 "--title=Select a root folder"],
                capture_output=True, text=True, timeout=120,
            )
            folder = result.stdout.strip()

        if not folder or result.returncode != 0:
            return {"path": None}
        return {"path": folder}
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {"path": None}


@router.get("/file/raw")
def serve_raw_file(path: str = Query(...)):
    """Serve a file as-is (for images, video, etc.)."""
    file_path = Path(path).expanduser().resolve()
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
