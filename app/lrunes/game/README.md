# LunaRunes Game

## Runtime

- Canonical feature route: LunaRunes /game
- Alternate LOC mount: /lrunes/game
- Runtime view: GameView.jsx
- Data/query logic: game-data.js
- Presentation: app/styles/game.css

Game 與 divination routes 分離；抽籤 Grammar 不自動成為 Game 規則。

## SSOT

Game runtime 只讀：

- silver.runes — Rune identity／group／必要描述欄位
- silver.game — Game 專用規則、事件、角色、巨觀組合與素材

GameView 不保存 canonical Game data；mutable Game definitions 必須來自 Supabase PostgreSQL。

silver.game Current record types：

- event — 32
- rune_action — 66
- role — 8
- rule — 30
- macro — 4
- asset — 13

## Current core rules

Current PostgreSQL rule rows 定義：

- 2–4 players。
- 起手抽 8 張，棄 3 張；基準手牌 5 張。
- 暫時手牌上限 8。
- 每次 Event 固定使用 2 張 Rune 回應。
- Event 一般補 2 張；Fail 補 1 張。
- De 範圍為 0–8；到達 8 不立即結束。
- R1–R3 Event。
- R4 Resonance。
- R5–R7 Event。
- R8 Resonance / Settlement。
- 只有 R8 平手才進入 R9 Duel。
- 自我共振 De +1。
- 破壞性共振指定其他玩家 De -2。

Event result：

| Result | Match | De | Draw |
| --- | --- | ---: | ---: |
| perfect | 4/4 | +2 | 2 |
| pass | 3/4 | +1 | 2 |
| fair | 2/4 | 0 | 2 |
| replenish | 1/4 | 0 | 2 |
| fail | 0/4 | -1 | 1 |

Special Rune actions：

- 65 玄：補牌 1 張。
- 66 命：補牌 2 張。

## Macro mapping

- SL = 靈魂＋連結
- ML = 礦物＋生命
- NE = 自然＋元素
- OD = 秩序＋無序

## Ownership rule

符文只會被影響，不會被永久奪取。允許的效果由 Current Game rule data 決定，例如查看、公開、棄置、封印、控頂或暫時失效。

## Assets

Game board 的 group／Event／author visual path 由 silver.game 提供。Rune card image 依固定 rune id + rune name 命名規則取得；不得把其他圖片冒充 Rune 0 德。
