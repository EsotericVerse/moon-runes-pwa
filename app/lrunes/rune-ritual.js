export const RUNE_RITUAL_STEP_MS=1000;
export const RUNE_RITUAL_DELAY_MS=5000;

const OPENING=Object.freeze({
  single:'您目前使用的是「單卡占卜模式」。',
  daily:'您目前使用的是「單卡每日抽牌模式」。',
  '2card':'您目前使用的是「雙卡占卜模式」：因 → 果。',
  '3card':'您目前使用的是「三卡占卜模式」：源 → 轉 → 合。',
  '5card':'您目前使用的是「五卡占卜模式」：雙卡＋單卡＋雙卡。',
  ow3gs:'您目前使用的是「OW3gs 11卡模式」：1–6 描述，7–11 判定。'
});

const CLOSING=Object.freeze({
  single:'正在找尋那條命運之線，即將揭牌。',
  daily:'正在對照今日時間與月相，即將揭開今日月符。',
  '2card':'正在整理兩張牌的因果位置，即將揭牌。',
  '3card':'正在整理源、轉、合的語意位置，即將揭牌。',
  '5card':'正在整理雙因、意外與雙果的位置，即將揭牌。',
  ow3gs:'正在整理兩段模型與十一張命運絲線，即將揭牌。'
});

const INTRO=Object.freeze([
  '月之符文由 66 枚核心符文、九組符文分組與四種卡牌方向構成。',
  '每張牌先看符文本義，再看正位、半正位、半逆位、逆位所描述的當下狀態。',
  '真實月相最後才加入，只作時間上的次要修飾，不取代符文本義與卡位結構。'
]);

export function runeRitualMessages(mode='single'){
  const key=Object.hasOwn(OPENING,mode)?mode:'single';
  return [OPENING[key],...INTRO,CLOSING[key]];
}
