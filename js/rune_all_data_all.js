import { direction } from './direction64.js';

const PHASES = ['新月', '上弦', '滿月', '下弦', '空亡'];
const DIRECTIONS = [
  { name: '正位', field: '正向表示' },
  { name: '半正位', field: '半正向表示' },
  { name: '半逆位', field: '半逆向表示' },
  { name: '逆位', field: '逆向表示' }
];

function buildAdvice(runeName, directionName, directionText, realPhase, runePhase) {
  const base = directionText || `${runeName}在${directionName}中顯示目前需要重新整理自身狀態。`;
  const phaseText = realPhase === runePhase
    ? `真實月相與符文月相同頻，${runeName}的主題會更明顯。`
    : `真實月相為${realPhase}，符文月相為${runePhase}，代表需要在不同節奏之間取得平衡。`;

  return {
    現在月相: realPhase,
    狀況形容: `${runeName}・${directionName}：${base}`,
    狀況表達: phaseText,
    每日占卜提醒: `今天先觀察${runeName}所指出的訊號，不急著下定論。`,
    每日占卜引導: `把注意力放回可以實際處理的部分，讓${directionName}的能量逐步落地。`,
    每日占卜祝福: `願你在${runeName}的提醒裡，找到清楚、穩定與可前進的方向。`,
    愛情建議: `關係中請先確認互動是否真實來回，避免單方面推測。${base}`,
    事業建議: `工作上適合先整理優先順序，處理最能推進現況的一步。${base}`,
    心理建議: `把情緒與事實分開看，允許自己慢慢釐清。${base}`,
    健康建議: `保持穩定作息，避免因焦慮而過度消耗。${base}`,
    生活建議: `今天適合用小行動收束混亂，不必一次完成全部。${base}`
  };
}

export const allData = direction
  .filter((item) => item && item.符文名稱)
  .map((item) => ({
    編號: item.編號,
    符文名稱: item.符文名稱,
    符文月相: item.符文月相,
    卡牌方向: DIRECTIONS.map(({ name, field }) => ({
      方向: name,
      表示: item[field],
      現況: PHASES.map((phase) => buildAdvice(
        item.符文名稱,
        name,
        item[field],
        phase,
        item.符文月相
      ))
    }))
  }));
