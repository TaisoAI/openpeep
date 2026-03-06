from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
import json
import shutil
import httpx
import io
import zipfile

from backend.config import load_config

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


@router.get("/peephub/browse")
def browse_peephub(
    q: str = "",
    category: str = "",
    sort: str = "downloads",
    page: int = 1,
    limit: int = 20,
):
    """Proxy browse requests to the configured PeepHub server."""
    config = load_config()
    base_url = config.get("peephub", {}).get("url", "https://peephub.taiso.ai")
    params = {"q": q, "category": category, "sort": sort, "page": page, "limit": limit}
    params = {k: v for k, v in params.items() if v}
    try:
        resp = httpx.get(f"{base_url}/api/peeps", params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Cannot connect to PeepHub at {base_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="PeepHub request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"PeepHub error: {e.response.text}")


@router.get("/peephub/peeps/{slug}")
def peephub_detail(slug: str):
    """Proxy detail request for a single peep from PeepHub."""
    config = load_config()
    base_url = config.get("peephub", {}).get("url", "https://peephub.taiso.ai")
    try:
        resp = httpx.get(f"{base_url}/api/peeps/{slug}", timeout=10)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Cannot connect to PeepHub at {base_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="PeepHub request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"PeepHub error: {e.response.text}")


class PublishRequest(BaseModel):
    peepPath: str
    category: str = "viewer"
    tags: list[str] = []


@router.post("/peeps/publish")
def publish_peep(req: PublishRequest):
    """Zip a local peep and publish it to PeepHub."""
    peep_dir = Path(req.peepPath)
    manifest_path = peep_dir / "peep.json"

    if not peep_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"Peep directory not found: {req.peepPath}")
    if not manifest_path.exists():
        raise HTTPException(status_code=400, detail="peep.json not found in peep directory")

    # Validate manifest has required fields
    try:
        manifest = json.loads(manifest_path.read_text())
    except Exception:
        raise HTTPException(status_code=400, detail="peep.json is not valid JSON")

    for field in ["id", "name", "version", "description", "entry", "capabilities", "matches"]:
        if field not in manifest:
            raise HTTPException(status_code=400, detail=f"peep.json missing required field: {field}")

    # Zip the peep folder
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in peep_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(peep_dir)
                zf.write(file_path, arcname)
    zip_bytes = buf.getvalue()

    # Read config for PeepHub URL and API key
    config = load_config()
    peephub = config.get("peephub", {})
    base_url = peephub.get("url", "https://peephub.taiso.ai")
    api_key = peephub.get("apiKey", "")

    if not api_key:
        raise HTTPException(status_code=400, detail="PeepHub API key not configured. Set it in Settings → Dev Mode.")

    # POST to PeepHub
    pub_headers = {"Authorization": f"Bearer {api_key}"}
    files = {"zip": ("peep.zip", zip_bytes, "application/zip")}
    data: dict[str, str] = {"category": req.category}
    if req.tags:
        data["tags"] = ",".join(req.tags)

    try:
        resp = httpx.post(f"{base_url}/api/peeps", headers=pub_headers, files=files, data=data, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Cannot connect to PeepHub at {base_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="PeepHub request timed out")
    except httpx.HTTPStatusError as e:
        detail = e.response.text
        try:
            body = e.response.json()
            details = body.get("details", [])
            detail = body.get("error", detail)
            if details:
                detail = f"{detail}: {'; '.join(details)}"
        except Exception:
            pass
        raise HTTPException(status_code=e.response.status_code, detail=f"PeepHub: {detail}")


class InstallRequest(BaseModel):
    slug: str
    version: str | None = None


@router.post("/peeps/install")
def install_peep(req: InstallRequest):
    """Download a peep from PeepHub and install to ~/.openpeep/peeps/."""
    config = load_config()
    base_url = config.get("peephub", {}).get("url", "https://peephub.taiso.ai")

    # Download the zip
    try:
        params = {}
        if req.version:
            params["version"] = req.version
        resp = httpx.get(
            f"{base_url}/api/peeps/{req.slug}/download",
            params=params,
            follow_redirects=True,
            timeout=30,
        )
        resp.raise_for_status()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Cannot connect to PeepHub at {base_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Download timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"PeepHub: {e.response.text}")

    zip_bytes = resp.content

    # Validate zip has peep.json
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
        if "peep.json" not in zf.namelist():
            raise HTTPException(status_code=400, detail="Downloaded zip missing peep.json")
        manifest = json.loads(zf.read("peep.json"))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file from PeepHub")

    # Remove existing and extract
    target_dir = INSTALLED_PEEPS_DIR / req.slug
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    zf.extractall(target_dir)

    return {
        "installed": True,
        "id": manifest.get("id", req.slug),
        "version": manifest.get("version", "unknown"),
    }


@router.get("/peep-samples/{peep_id}")
def get_peep_samples(peep_id: str):
    """Return sample data files from a peep's samples/ directory."""
    peeps = scan_peeps()
    peep = next((p for p in peeps if p["id"] == peep_id), None)
    if not peep or not peep.get("_path"):
        raise HTTPException(status_code=404, detail="Peep not found")

    samples_dir = Path(peep["_path"]) / "samples"
    if not samples_dir.exists():
        return {"files": [], "hasScreenshot": False}

    files = []
    has_screenshot = False
    for f in sorted(samples_dir.iterdir()):
        if f.is_file():
            if f.name.startswith("screenshot"):
                has_screenshot = True
                continue
            try:
                content = f.read_text()
                files.append({"name": f.name, "content": content, "path": str(f)})
            except UnicodeDecodeError:
                files.append({"name": f.name, "content": None, "binary": True, "path": str(f)})

    return {"files": files, "hasScreenshot": has_screenshot}


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


class PriorityRequest(BaseModel):
    priority: int


@router.patch("/peeps/{peep_id}/priority")
def update_peep_priority(peep_id: str, req: PriorityRequest, root: str = Query("")):
    """Update a peep's priority in its peep.json. Not allowed for built-ins."""
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
                raise HTTPException(status_code=403, detail="Cannot change priority of built-in peeps")
            try:
                manifest = json.loads(manifest_path.read_text())
                manifest["priority"] = req.priority
                manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
                return {"updated": True, "id": peep_id, "priority": req.priority}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to update priority: {e}")

    raise HTTPException(status_code=404, detail=f"Peep '{peep_id}' not found")
