from pathlib import Path

CARD_API_DIR = Path(__file__).resolve().parent
REPO_ROOT = CARD_API_DIR.parent

DATA_ROOT = REPO_ROOT / "data"
DATA_JSON_ROOT = DATA_ROOT / "json"
SHARED_JSON_DIR = DATA_JSON_ROOT / "shared"
RUNTIME_JSON_DIR = DATA_JSON_ROOT / "runtime" / "card_api"
GENERATED_JSON_DIR = DATA_JSON_ROOT / "generated"
ARCHIVE_JSON_DIR = DATA_JSON_ROOT / "archive"
EXPERIMENTAL_JSON_DIR = DATA_JSON_ROOT / "experimental"

def shared_json(name: str) -> Path:
    return SHARED_JSON_DIR / name

def runtime_json(name: str) -> Path:
    return RUNTIME_JSON_DIR / name

def generated_json(*parts: str) -> Path:
    return GENERATED_JSON_DIR.joinpath(*parts)
