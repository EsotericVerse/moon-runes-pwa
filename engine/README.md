# Experimental Engine

`engine/` contains research scripts only. Production runtime lives in `card_api/`.

## Data contract

Experimental scripts must not keep full authoritative rune copies inside `engine/`.

They read:

- `data/json/core/runes64.json`
- `data/json/core/rune_interpretations.json`

Experimental-only annotations and generated JSON are stored under:

- `data/json/experimental/engine/`

The duplicate `engine/runes_all_data.json` and the zero-byte `engine/runes64_alldata.json` were removed during repository normalization.

## Current scripts

- `g.py`: build semantic vectors/meta from core interpretations and experimental extended annotations.
- `g-1.py`: build experimental training records.
- `g-2.py`: experimental LoRA training script.

Experimental outputs do not become Canon or runtime data merely because they exist.
