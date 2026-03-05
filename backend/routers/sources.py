from fastapi import APIRouter
from backend.config import load_config, save_config

router = APIRouter()


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


@router.put("/sources")
def update_sources(payload: dict):
    """Update spaces configuration."""
    config = load_config()
    if "spaces" in payload:
        config["spaces"] = payload["spaces"]
    if "defaultStatuses" in payload:
        config["defaultStatuses"] = payload["defaultStatuses"]
    if "theme" in payload:
        config["theme"] = payload["theme"]
    if "showHiddenFiles" in payload:
        config["showHiddenFiles"] = payload["showHiddenFiles"]
    save_config(config)
    return {"saved": True}


@router.get("/session")
def get_session():
    """Return last saved session state."""
    config = load_config()
    return config.get("sessionState", {})


@router.put("/session")
def save_session(payload: dict):
    """Save session state to config."""
    config = load_config()
    config["sessionState"] = payload
    save_config(config)
    return {"saved": True}
