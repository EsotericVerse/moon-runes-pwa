(() => {
  function applyHomeCanonical() {
    const file = location.pathname.split('/').pop() || 'index.html';
    if (file !== 'index.html') return;

    document.title = 'LOC月典｜語言系統模型';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = 'LOC（月典／Luna Codex）是一套用來整理、分析、搜尋與推演語言的語言系統模型；月之符文（LunaRunes）由 66 個中文單字構成，可直接從抽牌、查詢與作品探索開始使用。';

    const heroMeta = document.querySelector('.hero .loc-header-meta');
    if (heroMeta) heroMeta.textContent = 'LOC · Luna Codex · 語言系統模型';

    const heroSubtitle = document.querySelector('.hero .loc-header-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = '從一個字、一張牌或一段文字開始，把散落的內容慢慢連起來。';

    const heroCopy = document.querySelector('.hero .loc-header-copy');
    if (heroCopy) heroCopy.textContent = '月典用來整理、搜尋、比較與推演語言。你不需要先懂語言模型，也不用先學會全部符文；先使用，再依需要往脈絡、作品、治理與推演深入。';

    const heroNote = document.querySelector('.hero-note');
    if (heroNote) heroNote.innerHTML = '<div class="moon" aria-hidden="true"></div><strong>第一次來，直接開始就好。</strong><p>可以先抽一張每日符文、問一件事，或查一個你在意的詞。月之符文由 66 個中文單字構成；當你想知道它們怎麼彼此連結，再往下看新手教學與完整架構。</p>';

    document.querySelectorAll('a[href="tutorial01.html"],a[href="tutorial02.html"]').forEach(link => {
      link.setAttribute('href', 'lots.html#beginner');
    });

    const startEyebrow = document.querySelector('[aria-labelledby="start-title"] .eyebrow');
    if (startEyebrow) startEyebrow.textContent = '從這裡開始';

    const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
    if (startCopy) startCopy.textContent = '第一次使用可以直接抽每日符文，或從新手教學開始；想查資料就進月之符文，想了解整體再看 LOC 架構。';

    const runeEyebrow = document.querySelector('.rune-entry-eyebrow');
    if (runeEyebrow) runeEyebrow.textContent = 'LunaRunes · 月之符文';

    const frameworkSection = document.getElementById('framework-map');
    if (frameworkSection) {
      frameworkSection.hidden = false;
      frameworkSection.style.display = '';
      const frameworkCopy = frameworkSection.querySelector('.loc-header-copy');
      if (frameworkCopy) frameworkCopy.textContent = 'LOC（月典／Luna Codex）由多個功能模組組成。月之符文提供最基本的語彙，其他模組再把這些語彙放進脈絡、作品、規則、知識與時間中。這裡開始進入完整架構，因此會保留必要的中英文專業名稱。';
    }

    const aboutSection = document.querySelector('[aria-labelledby="about-title"]');
    const aboutTitle = document.getElementById('about-title');
    if (aboutTitle) aboutTitle.textContent = '治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。';

    const aboutCopy = aboutSection?.querySelector(':scope > p');
    if (aboutCopy) aboutCopy.innerHTML = '<strong>給第一次來的人：</strong><br>LOC 不要求你先相信什麼，也不需要一次看懂全部。先抽一張牌、查一個詞、找一段作品或看看脈絡；只要能幫你把原本模糊的內容整理得更清楚，它就已經開始發揮作用。<br><br><strong>如果你想繼續學：</strong><br>月之符文從 66 個中文單字出發，逐步延伸到群組、方向、多卡組合、脈絡、全文搜尋、關係圖與時間推演。你可以只把它當工具使用，也可以再往下研究完整的語言系統。想把這套方法帶進 AI 工作流程，也可以下載 LOC GPT 技能包（Skills）。<br><br><strong>如果你是專業使用者：</strong><br>LOC 的底層包含語意規格（Spec）、詞類與群組主體性、檢索前置分類、資料來源與版本治理、可追溯語料庫（corpus）、關係圖（Graph）、演算法模組，以及跨時間推演。需要做檢索增強生成（RAG）或程式介面（API）整合時，再進一步使用相應的工程層；公開首頁不把這些術語當作使用門檻。<br><br><a href="LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT 技能包 v1.0.0 →</a><br><a href="https://github.com/EsotericVerse/moon-runes-pwa/tree/main/skills/lunarunes-semantic-group-classifier">查看月之符文語意群組分類 Skill →</a><br><br>LOC 與 LunaRunes 可以公開閱讀、研究與參考，不強迫任何人採用。若這套方法對你有啟發，請尊重 Copyleft、作者與來源紀錄；需要針對實際問題進行分析、治理、系統設計或專案實作，則屬於專業合作。<br><br><a href="lo3rwang.html">關於作者、方法沿革與合作方式 →</a>';

    document.querySelectorAll('.evolution-proof-item small.text-category').forEach(label => {
      const text = label.textContent.trim();
      if (text === 'Tutorial') label.textContent = '新手教學';
      if (text === 'Governance') label.textContent = '治理';
    });

    document.querySelectorAll('.evolution-proof-item .text-content').forEach(node => {
      node.innerHTML = node.innerHTML
        .replaceAll('Web View', '網頁版')
        .replaceAll('Graph RAG', '關係圖檢索（Graph RAG）')
        .replaceAll('RAG', '檢索增強生成（RAG）');
    });

    const main = document.querySelector('main.loc-page');
    if (main && aboutSection) main.appendChild(aboutSection);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(applyHomeCanonical, 0), { once: true });
  } else {
    setTimeout(applyHomeCanonical, 0);
  }
})();
