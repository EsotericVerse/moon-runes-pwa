(() => {
  function applyHomeCanonical() {
    const file = location.pathname.split('/').pop() || 'index.html';
    if (file !== 'index.html') return;

    document.title = 'LOC月典｜語言系統模組框架';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = 'LOC（月典／Luna Codex）是一套可進化、可重複使用的語言系統模組框架（Language Module Framework）；LunaRunes（月之符文）則是具有原創性的符號式語言模組，提供從入門使用到語言治理、RAG、知識架構與長期推演的完整實作。';

    const heroSubtitle = document.querySelector('.hero .loc-header-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = '先從一張符文開始理解，再逐步看見脈絡、作品、演算法、治理與時間如何連成一個可運作的語言系統。';

    const heroCopy = document.querySelector('.hero .loc-header-copy');
    if (heroCopy) heroCopy.textContent = 'LOC 是一套用來分析、整理、搜尋、治理並推演語言的 Language Module Framework。LunaRunes（月之符文）是其中可實際運作的 Symbolic Language Module；新手可以直接使用，專業使用者則可以往資料、RAG、Graph、演算法與治理層深入。';

    const heroNote = document.querySelector('.hero-note');
    if (heroNote) heroNote.innerHTML = '<div class="moon" aria-hidden="true"></div><strong>不用先學完整套系統。</strong><p>第一次來，可以先抽一張每日符文，看看 66 個中文字如何形成可操作的語意起點；有興趣再看新手教學、脈絡、搜尋與推演。想長期使用時，可將網站加入主畫面，或下載 LOC GPT Skills，把治理方法帶進自己的工作流程。</p>';

    document.querySelectorAll('a[href="tutorial01.html"],a[href="tutorial02.html"]').forEach(link => {
      link.setAttribute('href', 'lots.html#beginner');
    });

    const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
    if (startCopy) startCopy.textContent = '新手建議從每日符文或單卡開始，再依興趣進入符文資料、新手教學、脈絡分析、全文搜尋與推演；不需要先理解全部理論，也可以一邊使用、一邊學習。';

    const frameworkSection = document.getElementById('framework-map');
    if (frameworkSection) {
      frameworkSection.hidden = false;
      frameworkSection.style.display = '';
      const frameworkCopy = frameworkSection.querySelector('.loc-header-copy');
      if (frameworkCopy) frameworkCopy.textContent = 'LOC（月典／Luna Codex）是一套由多個語言系統模組組成的 Language Module Framework。LunaRunes 提供符號式語言模組的語彙基底，其他模組再把語彙放入脈絡、作品、演算法、知識與時間中。';
    }

    const aboutSection = document.querySelector('[aria-labelledby="about-title"]');
    const aboutTitle = document.getElementById('about-title');
    if (aboutTitle) aboutTitle.textContent = '治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。';

    const aboutCopy = aboutSection?.querySelector(':scope > p');
    if (aboutCopy) aboutCopy.innerHTML = '<strong>給第一次來的人：</strong><br>LOC 不要求你先相信什麼，也不需要一次看懂全部。先抽一張牌、查一個詞、找一段作品或看看脈絡；只要能幫你把原本模糊的東西整理得更清楚，它就已經開始發揮作用。<br><br><strong>如果你想繼續學：</strong><br>月之符文從 66 個中文單字出發，往群組、方向、多卡語法、Context、全文搜尋、Graph 與 Evolution 延伸。你可以把它當工具使用，也可以把它當一套語言系統逐層拆開研究；想把方法帶進自己的 AI 工作流程，也可以直接下載 LOC GPT Skills。<br><br><strong>如果你是專業使用者：</strong><br>LOC 不只處理抽牌介面。底層包含語意 Spec、詞性與群組主體性、RAG 前置分類、資料來源與版本治理、可追溯的 corpus、Graph 關係、演算法模組，以及跨時間的推演。重點不是把所有問題交給模型猜，而是先把可解釋、可治理、可重複的結構建立起來。<br><br><a href="LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0 →</a><br><a href="https://github.com/EsotericVerse/moon-runes-pwa/tree/main/skills/lunarunes-semantic-group-classifier">查看 LunaRunes Semantic Group Classifier Skill →</a><br><br>LOC 與 LunaRunes 可以公開閱讀、研究與參考，不強迫任何人採用。若這套方法對你有啟發，請尊重 Copyleft、作者與來源紀錄；需要針對實際問題進行分析、治理、系統設計或專案實作，則屬於專業合作。<br><br><a href="lo3rwang.html">關於作者、方法沿革與合作方式 →</a>';

    const main = document.querySelector('main.loc-page');
    if (main && aboutSection) main.appendChild(aboutSection);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(applyHomeCanonical, 0), { once: true });
  } else {
    setTimeout(applyHomeCanonical, 0);
  }
})();
