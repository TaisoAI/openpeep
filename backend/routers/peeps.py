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
