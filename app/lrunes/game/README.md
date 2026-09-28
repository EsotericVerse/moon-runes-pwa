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

## Current 2P Alpha round structure

`R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance`

- De range: 0–8
- Reaching 8 is not immediate victory.
- R8 is the official settlement point.
- Higher De wins.
- A 2P tie enters a final Duel.

## Event

Each Event response uses two Rune cards.

The four existing paired-group images are visual assets already available to the board:

- Soul × Connection
- Mineral × Life
- Nature × Element
- Order × Disorder

They are not a final limit of four Event themes.

The eight rune groups remain distinct. Event expansion can use two-group or two-role themes without collapsing the eight groups into four permanent gameplay categories.

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

- Event library expansion
- final eight-role design
- deeper Resonance/Battle effects
- advanced animation and data visualization
