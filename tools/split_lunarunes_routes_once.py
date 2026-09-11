from pathlib import Path

# 1) Global nav: LunaRunes main entry is lots.html; runes.html is reference only.
p=Path('js/loc-nav.js')
s=p.read_text(encoding='utf-8')
s=s.replace('{id:"runes",label:"月之符文",href:"runes.html"}', '{id:"runes",label:"月之符文",href:"lots.html"}', 1)
s=s.replace('"runes.html":"#beginner",', '"runes.html":"#reference",', 1)
s=s.replace('const beginnerHref=fileName()==="lots.html"?"lots.html#beginner":"runes.html#beginner";', 'const beginnerHref="lots.html#beginner";', 1)
s=s.replace('link("符文總覽","lots.html#library"),', 'link("66 符資料","lots.html#library"),', 1)
p.write_text(s,encoding='utf-8')

# 2) Homepage novice guide: LunaRunes data/main entry goes to lots.html.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('href="runes.html">月之符文</a>', 'href="lots.html#library">月之符文</a>')
p.write_text(s,encoding='utf-8')

# 3) Reference page: remove main/data-page ambiguity and point 66-rune data back to lots.
p=Path('runes.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<title>月之符文｜LOC 月典</title>', '<title>月之符文知識庫｜LOC 月典</title>', 1)
s=s.replace('content="月之符文：66 個基本文字語彙（Token）、四向、圖鑑、每日符文與多種抽牌方式。"', 'content="月之符文知識庫：判讀規則、命運句結構、案例、延伸體系與 Reference。66 符完整資料與圖鑑集中於 lots.html。"', 1)
s=s.replace('<p class="loc-header-meta">LunaRunes · Beginner</p>', '<p class="loc-header-meta">LunaRunes · Reference</p>', 1)
s=s.replace('<h1 class="loc-header-title">新手入門</h1>', '<h1 class="loc-header-title">月之符文知識庫</h1>', 1)
s=s.replace('<h2 class="loc-header-subtitle">不用先學會所有符文，也可以直接開始。</h2>', '<h2 class="loc-header-subtitle">判讀規則、案例與延伸體系集中於此。</h2>', 1)
s=s.replace('月之符文是 LOC 的語彙種子。第一次使用可以先抽牌，遇到想深入的符文再回到資料圖鑑查看定義、方向與月相。', '這一頁負責月之符文的判讀規則、案例與延伸知識；66 符完整資料、圖鑑、分組與抽牌功能統一由月之符文首頁 lots.html 提供。', 1)
s=s.replace('<button class="draw-mode-card" type="button" data-open-view="library"><strong>查看符文資料</strong><span>瀏覽 66 符文圖鑑。</span></button>', '<a class="draw-mode-card" href="lots.html#library"><strong>查看 66 符資料</strong><span>前往月之符文首頁瀏覽完整圖鑑。</span></a>', 1)
s=s.replace('月之符文的現行使用、判讀、範例與資料分層統一集中在本頁；不再另外維護重複的舊版 Rune Markdown 說明文件。', '月之符文的判讀規則、範例與延伸知識集中在本頁；66 符資料、圖鑑與抽牌功能集中在 lots.html，避免功能與 runtime 重複。', 1)

# Remove heavy operational/data runtime from reference page if present. Keep loc-nav and page-local reference switching.
for token in [
    '<script type="module" src="js/runeLibrary.js?v=20260905-3"></script>\n',
    '<script type="module" src="js/rune.js?v=20260911-1"></script>\n',
    '<script src="js/locMoonPhase.js"></script>\n',
    '<script type="module" src="js/rune-draw.js?v=20260908-4"></script>\n',
    '<script type="module" src="js/rune-daily-records.js?v=20260908-1"></script>\n'
]:
    s=s.replace(token,'')
p.write_text(s,encoding='utf-8')

print('split LunaRunes routes: lots=main/data/runtime, runes=reference')
