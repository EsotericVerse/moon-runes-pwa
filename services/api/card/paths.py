from pathlib import Path

CARD_API_DIR = Path(__file__).resolve().parent
REPO_ROOT = CARD_API_DIR.parents[2]

DATA_ROOT = REPO_ROOT / "data"
DATA_JSON_ROOT = DATA_ROOT / "json"

CORE_JSON_DIR = DATA_JSON_ROOT / "core"
REGISTRY_JSON_DIR = DATA_JSON_ROOT / "registries"
SOURCE_JSON_DIR = DATA_JSON_ROOT / "sources"
SEARCH_JSON_DIR = DATA_JSON_ROOT / "search"
GENERATED_JSON_DIR = DATA_JSON_ROOT / "generated"
ARCHIVE_JSON_DIR = DATA_JSON_ROOT / "archive"
EXPERIMENTAL_JSON_DIR = DATA_JSON_ROOT / "experimental"
INBOX_JSON_DIR = DATA_JSON_ROOT / "inbox"


def core_json(name: str) -> Path:
    return CORE_JSON_DIR / name


def registry_json(name: str) -> Path:
    return REGISTRY_JSON_DIR / name


def source_json(domain: str, name: str) -> Path:
    return SOURCE_JSON_DIR / domain / name


def search_json(domain: str, name: str) -> Path:
    return SEARCH_JSON_DIR / domain / name


def generated_json(*parts: str) -> Path:
    return GENERATED_JSON_DIR.joinpath(*parts)


def archive_json(*parts: str) -> Path:
    return ARCHIVE_JSON_DIR.joinpath(*parts)


def experimental_json(*parts: str) -> Path:
    return EXPERIMENTAL_JSON_DIR.joinpath(*parts)


def inbox_json(*parts: str) -> Path:
    return INBOX_JSON_DIR.joinpath(*parts)
