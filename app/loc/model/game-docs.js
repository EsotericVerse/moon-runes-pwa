// Game-only documentation restored from the historical LOC2 package.
// This is playtest/reference material. It does not redefine LunaRunes Canon.

export const GAME_DOC_SECTIONS = [
  ['rules','遊戲規則'],
  ['events','Event32'],
  ['actions','符文行動'],
  ['roles','八職業'],
  ['history','版本與開發說明'],
];

export const GAME_ROLES = [
  ['魂者／薩滿','承載、記錄、傾聽','Intervention','靈魂'],
  ['仲裁／判官','裁斷、結案','Restricted','連結'],
  ['療癒／醫者','回歸基準、逆向校正','Intervention','生命'],
  ['培育／德魯伊','成長、等待、修剪','Intervention','自然'],
  ['盾衛／戰士','承擔、延遲、承重','Intervention','礦物'],
  ['元素／法師','導流、切換、臨界控制','Intervention','元素'],
  ['策士／學者','校準、排除、對齊時序','Restricted','秩序'],
  ['混沌／方士','啟動變數','Null','無序'],
];

export const GAME_ACTIONS = {
1:'Event cost -1 (min 0).',2:'De +2; Event 3/4+ additional +1.',3:'One response card covers another chosen macro-state.',4:'Retrieve one discard, then discard one hand card.',5:'Negate one De loss this round.',6:'Look at top 3; choose 1 to hand; reorder the rest.',7:'Copy opponent action type; if skill, self +1 and draw1/discard1.',8:'Historical threshold De >=12: +3; otherwise +1. De8 migration pending playtest.',
9:'Choose De +1 and draw1/discard1, or one response card crosses macro-state once.',10:'Cancel opponent current action if not acted; otherwise opponent -1.',11:'Seal one opponent hand card until round end.',12:'Opponent attack -2→-1; self-push +1→0 this round.',13:'Draw2/discard1; Event cost -1.',14:'Opponent reveals hand; choose one to discard.',15:'See opponent hand; self +1; Event coverage +1 (max +1).',16:'See opponent top3; choose one to top marked misplaced; when drawn discard immediately.',
17:'+1 draw1; Event 2/4 or lower +1.',18:'Event cost -1; cannot be canceled by Sever.',19:'Choose push to next even then draw2/discard1, or coverage +1.',20:'Discard 0–5; each discard draw1 and +1, max +3.',21:'If behind +2, otherwise +1.',22:'De loss -1 (min 0) this round.',23:'One response card any macro-state; cannot attack.',24:'Previous Event success/perfect +2, otherwise +1 draw1/discard1.',
25:'De cannot fall below round-start De.',26:'Event 3/4+ +3, otherwise +1.',27:'Draw2; may discard one; if discard NE +1.',28:'Each NE response reduces Event cost -1, max -2.',29:'Retrieve one NE discard; then draw1.',30:'Mark one seed; reveal before R8: +2 then discard.',31:'Historical threshold De>=10 +4, otherwise +2. De8 migration pending playtest.',32:'Top4: one to hand, one discard, rest back.',
33:'Choose self +2, or opponent -2 and self discard1.',34:'Incoming De loss -1 and draw1/discard1.',35:'See one opponent hand card; SL/NE/OD increases opponent Event cost +1; ML discards it.',36:'Event fixed push +1 (historical total +3); immune seal.',37:'Immune Sever; total De loss max2.',38:'Event 3/4+ opponent -3, otherwise -1.',39:'Top5 choose2 to hand, rest back.',40:'Opponent random discard1; if NE opponent -1.',
41:'+2; Event 3/4+ additional +1.',42:'Choose opponent -2 or self +2; historical De>=12 both; De8 migration pending playtest.',43:'Draw2/discard1; push De to next even; Event cost -1.',44:'Opponent -2 self +1, self discard1.',45:'Draw1 self +1; ignore one seal.',46:'Event result floor normal 2/4.',47:'Opponent -3; if opponent reaches0 self +2.',48:'Choose self +1 and opponent cost +1, or draw2/discard1 and own cost -1.',
49:'Choose self De set to higher of two, or opponent gains -1 this round.',50:'Draw2/discard1; Event cost -2.',51:'Choose +2, or one response card any macro-state; if De<=6 +1.',52:'Opponent cannot use Rune skill this round; only attack/self-push.',53:'If Resonance +2; otherwise +1 draw1/discard1.',54:'Extra basic self-push +1; cannot attack.',55:'Refill to5; Event cost -1.',56:'Event 3/4+ +1; Event 0/4 becomes 1/4 replenish.',
57:'If De<=opponent +3, otherwise +1.',58:'Opponent -3; historical opponent De>=12 gives -4; De8 migration pending playtest.',59:'Random d6: 1–2 self +4; 3–4 self +2; 5 self→0; 6 opponent→0.',60:'Rewrite basic action: attack→opponent -1 + draw2/discard1; self-push→+1 + seal opponent hand1.',61:'Invert action once: attack→self+1; self-push→opponent-2.',62:'Swap recipient of first De change this round.',63:'Event always normal 2/4 (cost -2); then self +2.',64:'If R8 +4, otherwise +2.'
};

export const GAME_HISTORY = [
  'Historical provenance: LOC2 Semantic Playground / MVP v1.0–v1.3 Alpha.',
  'Current migration: Game is a LunaRunes Game feature; LOC2 remains historical provenance only.',
  'Current 2P Alpha: De 0–8; reaching 8 does not end the game; EEE-R-EEE-R; settle only after R8; tie enters Duel.',
  'Current 3P/4P Alpha skeleton: E-B-E-B-E-B-E-B. Cooperative Event and Battle details remain playtest work.',
  'Event responses use exactly two Rune cards. Three-card 源→轉→合 is not part of the Game Alpha.',
  'Event relation is unordered interaction: A × B = B × A. Reading grammar remains a separate system.',
  'Historical De16-dependent Rune thresholds are preserved as provenance and must be migrated through playtest rather than silently rewritten.',
];
