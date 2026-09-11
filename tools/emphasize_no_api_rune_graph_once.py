from pathlib import Path

for name in ['runes.html','context.html']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace('<h2>符文脈絡 Graph</h2>', '<h2>符文脈絡 Graph · No API</h2>')
    s=s.replace('直接由現有 LunaRunes 資料建立：關鍵詞／反向關鍵詞 → 符文 → 唯一群組，並納入既有額外規則與 ownership。No API，不建立第二套 Canon。', 'No API：直接使用現有 LunaRunes 的關鍵詞、反向關鍵詞、符文、唯一群組與既有規則建立 Graph，不呼叫外部 API，也不建立第二套 Canon。')
    s=s.replace('<strong>符文脈絡 Graph</strong><span>查看關鍵詞、符文與群組的現有關係。</span>', '<strong>符文脈絡 Graph · No API</strong><span>直接用現有關鍵詞、符文與唯一群組建立關係。</span>')
    p.write_text(s,encoding='utf-8')

for name in ['runes.html','context.html']:
    s=Path(name).read_text(encoding='utf-8')
    assert '符文脈絡 Graph · No API' in s
    assert '不呼叫外部 API' in s
print('No API emphasis ready')
