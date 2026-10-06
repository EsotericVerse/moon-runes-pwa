export const RUNE_RITUAL_STEP_MS=1000;
export const RUNE_RITUAL_DELAY_MS=5000;

const WAITING='請等待五秒，月之符文正在感應。';

const MODE_NOTE=Object.freeze({
  single:'單卡用一枚符文回答當下最核心的狀態。',
  daily:'每日符文以今天為時間範圍，提供一張當日指引。',
  '2card':'雙卡依「因 → 果」閱讀兩者之間的關係。',
  '3card':'三卡依「源 → 轉 → 合」形成一條語意路徑。',
  '4card':'四卡依 1 / 2 / 1 組合。',
  '5card':'五卡由雙因、意外變化與雙果共同構成。',
  '6card':'六卡依 2 / 2 / 2 組合。',
  '7card':'七卡依 2 / 3 / 2 組合。',
  '8card':'八卡依 3 / 2 / 3 組合。',
  '9card':'九卡依 3 / 3 / 3 組合。',
  '10card':'十卡依 4 / 2 / 4 組合。',
  ow3gs:'OW3gs 以 1–6 描述成因，再由 7–11 進行核心判定。'
});

const KNOWLEDGE='月之符文由 66 枚核心符文、九組符文分組與四種卡牌方向構成。';
const READING='每張牌先看符文本義，再看卡牌方向；真實月相最後才作時間上的次要修飾。';
const CLOSING='感應的符文將會告訴你的籤詩。';

export function runeRitualMessages(mode='single'){
  const key=Object.hasOwn(MODE_NOTE,mode)?mode:'single';
  return [WAITING,KNOWLEDGE,MODE_NOTE[key],READING,CLOSING];
}
