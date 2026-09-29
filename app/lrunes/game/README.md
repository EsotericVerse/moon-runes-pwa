# LunaRunes Game

Current Game runtime and documentation are consolidated under `app/lrunes/game/`.

## Current scope

- Route: `/game` and `/lrunes/game`
- Runtime view: `GameView.jsx`
- SQL adapter / game logic: `game-data.js`
- Presentation: `app/styles/game.css`

The Game is independent from divination routes such as `/duel`.

## SSOT

Game runtime reads only:

- `silver.runes` — Rune canonical identity / group / descriptive fields
- `silver.game` — all Game-specific data and rules

Directional text is not part of the Game payload. Do not reintroduce Game data as JS constants, JSON registries, KM files, or legacy LOC2 runtime fallbacks.

## silver.game structure

`silver.game` uses explicit column segments rather than a generic content dump.

### Event columns
- `event_id`
- `event_group`
- `event_title`
- `event_requirement`
- `event_description`

### Rune Action columns
- `rune_id`
- `rune_name`
- `rune_group`
- `rune_action_text`
- `rune_action_kind`
- `rune_action_value`

### Role columns
- `role_id`
- `role_formal_name`
- `role_public_name`
- `role_group`
- `role_core_function`
- `role_intervention_type`
- `role_intervention_name`
- `role_tool`
- `role_tagline`

### Rule columns
- `rule_code`
- `rule_title`
- `rule_text`
- `rule_round_no`
- `rule_phase`
- `rule_result_code`
- `rule_de_delta`
- `rule_draw_count`
- `rule_value_int`
- `rule_value_text`

### Macro columns
- `macro_code`
- `macro_group_a`
- `macro_group_b`
- `macro_title`
- `macro_description`

### Asset columns
- `asset_code`
- `asset_kind`
- `asset_group`
- `asset_group_2`
- `asset_path`
- `asset_title`

## Current data

`silver.game` currently contains:

- Event32: 32 Alpha Event records
- Rune Action: 66 records
- Role: 8 records
- Macro: 4 records
- Rule: Current rules, eight round phases and five Event result rows
- Asset: eight group visuals, four paired-group Event visuals and author visual

Rune Action 01–64 was migrated from the canonical mother field `silver.runes.char_action`.

Current special Rune Game actions:

- 65 玄 — draw 1
- 66 命 — draw 2

## Current macro mapping

- SL = Soul + Link / 靈魂＋連結
- ML = Mineral + Life / 礦物＋生命
- NE = Nature + Element / 自然＋元素
- OD = Order + Disorder / 秩序＋無序

Historical Event32 text that used `OC` is normalized to Current `OD`.

## Current round structure

`R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance`

- 2–4 players use the same eight-round structure.
- De range is 0–8.
- Reaching 8 does not immediately end the game.
- R8 is the settlement point.
- Only an R8 tie enters R9 Duel.
- R9 is a tiebreak Duel, not a normal ninth round.

## Runtime rule

`GameView.jsx` must not own canonical Game data.

`game-data.js` may contain query, validation, normalization and game calculations, but all mutable Game definitions must come from SQL.

## Visual layer

The Game board reads group / Event / author visual paths from `silver.game`.

Rune card image filenames are derived from Rune ID + Rune name because the canonical files already follow the fixed `NN_名稱.png` naming convention.

The separate Rune 0 德 image is not currently present under a known main path and must not be fabricated or aliased to the aboutme image.

## RC8 boundary

RC8 closes structural consolidation and the first graphical pass. Post-RC8 work can include:

- Event32 balance and scenario refinement
- expansion beyond the 32-card Alpha deck
- final eight-role gameplay design
- deeper Resonance / Duel effects
- advanced animation and data visualization
