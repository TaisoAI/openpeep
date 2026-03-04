from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import json
import subprocess
import sys

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
