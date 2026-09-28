# LunaRunes Game

Current Game implementation and documentation live together in this directory.

## Current scope

- Route: `/game` and `/lrunes/game`
- Runtime view: `GameView.jsx`
- Rule/data helpers: `game-data.js`
- UI documentation data: `game-docs.js`
- Visual asset registry: `game-assets.js`
- Presentation: `app/styles/game.css`

The Game is independent from divination routes such as `/duel`.

## Canonical rune data

Game reads only:

- `silver.runes`
- `silver.runes_etc`

There is no Game-specific rune JSON, legacy JS data fallback, or second rune SSOT.

Playable deck:

- Rune 01–66: playable
- Rune 0 德: author/governance rune; not drawn into the playable deck
- 67 aboutme: author visual asset; not a playable rune

## Current round structure

`R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance`

- This is the Current round sequence for 2–4 players.
- De range: 0–8.
- Reaching 8 is not immediate victory.
- R8 is the official settlement point.
- Higher De wins.
- Only a tie after R8 enters R9 Duel.
- R9 is a tiebreak Duel, not a normal ninth round.

## Event32

The 32-card Alpha Event text deck is restored in `game-events.js`.

Each Current Event response uses two Rune cards.

Current four-group shorthand is fixed as:

- SL = Soul + Link / 靈魂＋連結
- ML = Mineral + Life / 礦物＋生命
- NE = Nature + Element / 自然＋元素
- OD = Order + Disorder / 秩序＋無序

Historical Event32 text used `OC` for the last shorthand in some records. Current normalizes that historical typo to `OD`.

The four existing paired-group images are visual assets for these four pair groups. They are not a limit of four Event cards. The Event deck contains 32 Alpha scenarios, and later Event design can expand beyond the Alpha deck.

## Eight roles

The historical eight-role material is preserved in `game-docs.js` as discussion material. Role names, modes, and detailed mechanics are not frozen for RC8.

## Visual layer

Current visual sources include:

- 01–66 square Rune card images
- eight group representative images
- four paired-group Event images
- `pics/aboutme.png` as the current author/about visual

The separate Rune 0 德 image is not currently present under a known path in main, so the Game must not fabricate or alias it to the aboutme image.

## Installed modules used by Game

- React: board/state rendering
- TanStack Query: query lifecycle only; Game forces fresh mount reads
- Zod: validates rows returned from the two canonical rune tables

Other installed modules such as Recharts or vis-network are not added merely for decoration. They can be introduced later when De history or Resonance relationships need a real data visualization.

## Historical boundary

Historical LOC2 / Semantic Playground is an earlier Game lineage name, not the Current product name.

Historical material does not restore the retired LOC1–8 architecture and does not make OW3gs four-direction interpretation part of the base Game rules.

## RC8 boundary

RC8 closes structural consolidation and the first graphical pass. The following are intentionally post-RC8 product work:

- Event32 balance and scenario refinement
- expansion beyond the 32-card Alpha deck
- final eight-role gameplay design
- deeper Resonance / Duel effects
- advanced animation and data visualization
