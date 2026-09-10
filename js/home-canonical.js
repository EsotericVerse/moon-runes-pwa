(() => {
  function applyHomeCanonical() {
    const file = location.pathname.split('/').pop() || 'index.html';
    if (file !== 'index.html') return;

    document.title = 'LOC月典｜語言模組框架';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = 'LOC（月典／Luna Codex）是一套可進化、可重複使用的語言模組框架（Language Module Framework），由 LOC1–LOC8 八個語言系統模組（Language System Modules）組合而成。';

    const heroSubtitle = document.querySelector('.hero .loc-header-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = '從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。';

    const heroCopy = document.querySelector('.hero .loc-header-copy');
    if (heroCopy) heroCopy.textContent = '月典是一套用來分析、整理、搜尋與推演語言的系統。它從月之符文開始，把文字、作品、脈絡與時間串起來，讓累積的資料可以繼續被理解、比較與推演。';

    const heroNote = document.querySelector('.hero-note');
    if (heroNote) heroNote.innerHTML = '<div class="moon" aria-hidden="true"></div><strong>月之符文是種子，但不是使用門檻。</strong><p>不必先知道或學會所有符文，也不用先會解牌，更不需要先理解什麼是語言系統。你可以先抽牌、找作品、看脈絡分析、看關鍵字排行；想深入時，LOC 再把其模組架構展開給你。</p>';

    const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
    if (startCopy) startCopy.textContent = '完全的新手可以看「新手教學」。第一次使用可直接抽取每日符文。想查月之符文資料可進入「月之符文」。想理解整體則查看「LOC1–8 模組架構」。';

    const frameworkSection = document.getElementById('framework-map');
    if (frameworkSection) {
      frameworkSection.hidden = false;
      frameworkSection.style.display = '';
      const frameworkCopy = frameworkSection.querySelector('.loc-header-copy');
      if (frameworkCopy) frameworkCopy.textContent = 'LOC（月典／Luna Codex）是一套可進化、可重複使用的語言模組框架（Language Module Framework）。由 LOC1–LOC8 八個語言系統模組（Language System Modules）組合而成。';
    }

    const aboutSection = document.querySelector('[aria-labelledby="about-title"]');
    const aboutTitle = document.getElementById('about-title');
    if (aboutTitle) aboutTitle.textContent = '治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。';

    const aboutCopy = aboutSection?.querySelector(':scope > p');
    if (aboutCopy) aboutCopy.innerHTML = '月之符文本身是占卜指示籤詩的分析建議，重在符文本身的語彙交叉分析；巧妙的是，即使轉換語系也能通用。<br>它採取不帶神秘學預設的中立態度，重在文字本身，不預設道德判斷。<br><br>月典從月之符文開始，後來逐步演變成與月之符文相輔相成的語言模型框架；<br>而月之符文，也在這個過程中演變成了符號式語言模型。<br><br>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，<br>而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構模型。<br><br>人總是要進步。過去雖不可改變，仍可以從過去截取經驗，才能進一步面對未來的各種可能。<br><br>月典提供一套方便的解析模組，不強迫接受，但可以參考。<br><br>只希望每個人都能藉由這些，更有效率、更輕鬆地整理自己的數位資產與語言紀錄。';

    const main = document.querySelector('main.loc-page');
    if (main && aboutSection) main.appendChild(aboutSection);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(applyHomeCanonical, 0), { once: true });
  } else {
    setTimeout(applyHomeCanonical, 0);
  }
})();
