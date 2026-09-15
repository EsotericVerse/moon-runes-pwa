export function realMoonPhase(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const day = Number(formatter.formatToParts(date).find(part => part.type === 'day')?.value);
    if (day >= 1 && day <= 7) return '新月';
    if (day <= 14) return '上弦';
    if (day <= 21) return '滿月';
    if (day <= 28) return '下弦';
    if (day <= 30) return '空亡';
  } catch {}
  return '未知';
}
