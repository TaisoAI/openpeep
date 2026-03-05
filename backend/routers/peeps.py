from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import json
import shutil

router = APIRouter()

# Three-tier peep directories (lowest to highest priority)
BUILTIN_PEEPS_DIR = Path(__file__).parent.parent.parent / "peeps"
INSTALLED_PEEPS_DIR = Path.home() / ".openpeep" / "peeps"

TIER_BUILTIN = "builtin"
TIER_INSTALLED = "installed"
TIER_PROJECT = "project"


def _scan_directory(directory: Path, tier: str) -> list[dict]:
    """Scan a single directory for peep manifests."""
    peeps = []
    if not directory.exists():
        return peeps
    for folder in sorted(directory.iterdir()):
        if not folder.is_dir() or folder.name.startswith("_") or folder.name.startswith("."):
            continue
        manifest_path = folder / "peep.json"
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text())
                manifest["_path"] = str(folder)
                manifest["_tier"] = tier
                peeps.append(manifest)
            except Exception:
                pass
    return peeps


def scan_peeps(workspace_root: Optional[str] = None) -> list[dict]:
    """Scan all three tier directories. Higher tiers shadow lower tiers by id."""
    builtin = _scan_directory(BUILTIN_PEEPS_DIR, TIER_BUILTIN)
    installed = _scan_directory(INSTALLED_PEEPS_DIR, TIER_INSTALLED)
    project = []
    if workspace_root:
        project_dir = Path(workspace_root) / "peeps"
        project = _scan_directory(project_dir, TIER_PROJECT)

    # Merge with shadowing: higher tier wins on same id
    merged: dict[str, dict] = {}
    for peep in builtin:
        merged[peep["id"]] = peep
    for peep in installed:
        merged[peep["id"]] = peep
    for peep in project:
        merged[peep["id"]] = peep

    return list(merged.values())


def _find_peep_dir(peep_id: str, workspace_root: Optional[str] = None) -> Optional[Path]:
    """Find a peep's directory by searching tiers in priority order (highest first)."""
    search_dirs = []
    if workspace_root:
        search_dirs.append(Path(workspace_root) / "peeps")
    search_dirs.append(INSTALLED_PEEPS_DIR)
    search_dirs.append(BUILTIN_PEEPS_DIR)

    for base in search_dirs:
        candidate = base / peep_id
        if candidate.is_dir() and (candidate / "peep.json").exists():
            return candidate
        # Also allow _sdk and other underscore dirs (no peep.json required)
        if candidate.is_dir() and peep_id.startswith("_"):
            return candidate

    return None


@router.get("/peeps")
def list_peeps(root: str = Query("")):
    """Return all installed peep manifests."""
    return {"peeps": scan_peeps(root or None)}


@router.get("/peeps/{peep_id}/{file_path:path}")
def serve_peep_file(peep_id: str, file_path: str, root: str = Query("")):
    """Serve static files from a peep's folder, searching all tiers."""
    peep_dir = _find_peep_dir(peep_id, root or None)
    if not peep_dir:
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

    headers = {"Cache-Control": "no-store, must-revalidate"}
    return FileResponse(target, media_type=media_type, headers=headers)


@router.delete("/peeps/{peep_id}")
def uninstall_peep(peep_id: str, root: str = Query("")):
    """Uninstall a community peep. Built-ins are protected."""
    # Search all tiers to find the peep and its tier
    tiers = []
    if root:
        tiers.append((Path(root) / "peeps", TIER_PROJECT))
    tiers.append((INSTALLED_PEEPS_DIR, TIER_INSTALLED))
    tiers.append((BUILTIN_PEEPS_DIR, TIER_BUILTIN))

    for base, tier in tiers:
        candidate = base / peep_id
        manifest_path = candidate / "peep.json"
        if candidate.is_dir() and manifest_path.exists():
            if tier == TIER_BUILTIN:
                raise HTTPException(status_code=403, detail="Cannot uninstall built-in peeps")
            shutil.rmtree(candidate)
            return {"uninstalled": True, "id": peep_id, "tier": tier}

    raise HTTPException(status_code=404, detail=f"Peep '{peep_id}' not found")
