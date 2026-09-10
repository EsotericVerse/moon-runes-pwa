(() => {
  function applyHomeCanonical() {
    const file = location.pathname.split('/').pop() || 'index.html';
    if (file !== 'index.html') return;

    document.title = 'LOC月典｜語言系統模組';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = 'LOC（月典／Luna Codex）是一套可進化、可重複使用的語言系統模組；月之符文（LunaRunes）則是符號式語言模組，以符文語彙提供具體的描述方式。';

    const heroSubtitle = document.querySelector('.hero .loc-header-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = 'LOC 幫你分類，月之符文幫你描述；從一個語意開始，再把脈絡、作品與時間慢慢接起來。';

    const heroCopy = document.querySelector('.hero .loc-header-copy');
    if (heroCopy) heroCopy.textContent = '月典是一套用來分析、整理、搜尋與推演語言的語言系統模組。它負責把不同問題與資料分到適合的位置；月之符文則用 66 個符文、群組、方向與組合，示範語言可以怎麼被描述。';

    const heroNote = document.querySelector('.hero-note');
    if (heroNote) heroNote.innerHTML = '<div class="moon" aria-hidden="true"></div><strong>先記兩件事就好：LOC 幫你分類；月之符文幫你描述。</strong><p>不用先懂模型、演算法或所有符文。想整理一件事，可以用 LOC 看它屬於哪一類；不知道怎麼描述，也可以先抽一張符文，取得一個可以開始思考的角度。</p>';

    const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
    if (startCopy) startCopy.textContent = '第一次來，只要先知道：LOC 幫你分類，月之符文幫你描述。完全不知道怎麼開始，可以直接抽每日符文；有一件明確的事想問，就用單卡；想知道整體怎麼運作，再看新手教學或 LOC 架構圖。';

    const frameworkSection = document.getElementById('framework-map');
    if (frameworkSection) {
      frameworkSection.hidden = false;
      frameworkSection.style.display = '';
      const frameworkCopy = frameworkSection.querySelector('.loc-header-copy');
      if (frameworkCopy) frameworkCopy.textContent = 'LOC（月典／Luna Codex）是一套可進化、可重複使用的語言系統模組。它把語言與問題依用途分類；月之符文則提供一套符號式的描述方式，兩者彼此配合。';
    }

    const aboutSection = document.querySelector('[aria-labelledby="about-title"]');
    const aboutTitle = document.getElementById('about-title');
    if (aboutTitle) aboutTitle.textContent = '治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。';

    const aboutCopy = aboutSection?.querySelector(':scope > p');
    if (aboutCopy) aboutCopy.innerHTML = 'LOC 負責分類，月之符文負責描述。<br>LOC 把語言、問題與資料切成可以處理的模組；月之符文則以 66 個符文、群組、方向與組合，提供一套具體的符號式描述方式。<br><br>月之符文保留籤詩的指引形式，但不需要先接受神秘學前提。它把原本模糊、難以回答的不確定性，先整理成幾個可以理解、比較與選擇的方向；像是先把申論題整理成選擇題，再由人自己判斷。<br><br>月典從月之符文開始，也從月之符文實際的切分方式得到很多方法；反過來，LOC 又把這些切分、組合、脈絡與推演的方法整理成可重複使用的語言系統模組。兩者因此相輔相成。<br><br>整合出月典，不是為了把人生固定成某種模式，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析、可再選擇的結構。';

    const main = document.querySelector('main.loc-page');
    if (main && aboutSection) main.appendChild(aboutSection);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(applyHomeCanonical, 0), { once: true });
  } else {
    setTimeout(applyHomeCanonical, 0);
  }
})();
