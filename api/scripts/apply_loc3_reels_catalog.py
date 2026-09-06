from __future__ import annotations

import json
import sys
from pathlib import Path

CARD_API = Path(__file__).resolve().parents[1]
if str(CARD_API) not in sys.path:
    sys.path.insert(0, str(CARD_API))
from paths import RUNTIME_JSON_DIR

DATA_DIR = RUNTIME_JSON_DIR
INDEX_PATH = DATA_DIR / "LOC3_LYRICS_SEARCH_v0.1.json"
CATALOG_PATH = DATA_DIR / "LOC3_MEDIA_LINKS_v0.1.json"


REELS = [
    ("你若想跟我有以後", "7c466214-2cb9-4ea4-bc94-03e9741f52d0", "DaU4VaaoDad", "aBTbf4rLUn8ddmtJ"),
    ("人生月台", "9a56d555-d559-4402-8c17-47f8bfa6515f", "DZdqhJ3oYNm", "nUZEw9am8T82swgs"),
    ("月光把影子拉長", "b899100f-e2ec-4cbb-97f1-a1d598047297", "DcmFJ_TBUdB", "RoPiwKjVUpXzRK1i"),
    ("答案不用現在", "7f913cd4-6d81-419f-81db-3c55548c1b8a", "Dcir69Eorv5", "F4lAXVuTwYWEZZK1"),
    ("微月光知道", "611c9156-2d03-4104-a44b-d6d776bcbc2c", "Dbpzo7AIwHK", "kya8Z4N9Wto0gT9K"),
    ("自由的月", "d583b308-bf96-4f64-a583-f2f0492b90ad", "DblIpMvIxlH", "ENnVM2m1KvY92fJA"),
    ("不預支以後", "92e5740d-3258-40ce-b8aa-afa19f8271ce", "DbiSVRmI7Oc", "qhSdWGHOVY8nHuhm"),
    ("回到我的風", "68586151-ba0e-4f72-830f-0c5251e818f8", "DbhCSU2Iq9u", "5qLTNvMzDDwu5JOA"),
    ("留一個位置", "bf52b84c-74e6-4b94-87e2-b8dbff16b3f3", "Dbfeq0uoaWw", "K4gcTGB72rubyKgc"),
    ("空隙之間", "c3dfcdb3-bce2-4cc4-ab3f-34298e93ab4c", "Dbagd7JIS8U", "dMbdpQeTtc7trBvb"),
    ("風起之後", "fb9cce47-9c4f-42e6-84e3-04df918931bf", "DbZh0_hIzOe", "7ndMR8xQm9lkLQ4Q"),
    ("問號的終點", "2c9461ee-9e95-468b-89f7-0490b62a18ee", "DbXo7sLIY4w", "hNAsZhatBZAKAYTF"),
    ("落地以前", "ae02f7c0-92ae-4b03-a7c9-cb588045f003", "DbVb6_MIgmv", "eyhR6PAA7jx2dngC"),
    ("風晴以前", "fff9fff5-0645-4d1d-986d-87ab23f9179a", "DbRk0sdoT6u", "patdCpprEXc0w45S"),
    ("走回自由模樣", "ddece632-8f69-492c-9779-48e212672bc7", "DbNjNcsoMfg", "SLqvk2z4K7ukePRt"),
    ("等風也造風", "8df54670-c3bf-4ff1-ae59-d27178e61377", "Da_bGP4hSVg", "mJu9XOyvAaWPP4oy"),
    ("整備已完成", "0e890eb8-6be0-4549-99bc-469e409cc68d", "Da7tpEUosOd", "Ae1X5l8f5jFnK2C8"),
    ("用你喜歡的方式", "a65a5a6c-ade3-4e5a-bd41-bb01641aba0d", "Daz7ienK6R3", "CEvQSEtcVGehDYnR"),
    ("掌聲之外", "692875f9-f93a-4680-a026-c7c5b9b7e56a", "DazgGRWoA2a", "yBJbeFEmWtNYNyPc"),
]


def main() -> None:
    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    versions: dict[str, dict] = {}
    for shard_name in index["shards"]:
        shard_path = DATA_DIR / shard_name
        payload = json.loads(shard_path.read_text(encoding="utf-8"))
        for work in payload.get("works", []):
            for version in work.get("versions", []):
                versions[version["song_id"]] = version

    catalog = []
    for title, song_id, instagram_code, suno_share_code in REELS:
        instagram_url = f"https://www.instagram.com/p/{instagram_code}/"
        suno_share_url = f"https://suno.com/s/{suno_share_code}"
        version = versions.get(song_id)
        catalog.append({
            "title": title,
            "song_id": song_id,
            "suno_url": f"https://suno.com/song/{song_id}",
            "suno_share_url": suno_share_url,
            "ig_preview_url": instagram_url,
            "media_type": "instagram_reels_preview",
            "preview_duration_seconds": 30,
            "ig_plays": None,
            "linked_to_semantic_index": version is not None,
        })

    output = {
        "dataset": {
            "name": "LOC3 Media Links",
            "version": "0.1.0",
            "updated_at": "2026-09-03",
            "reels_count": len(catalog),
            "linked_count": sum(item["linked_to_semantic_index"] for item in catalog),
            "pending_count": sum(not item["linked_to_semantic_index"] for item in catalog),
            "notes": "IG Reels is a preview channel; its metrics remain separate from Suno plays.",
        },
        "items": catalog,
    }
    CATALOG_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
