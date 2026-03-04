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
