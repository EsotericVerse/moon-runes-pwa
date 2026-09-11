from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Keep the surrounding framework prose aligned with the current module definitions.
s = s.replace(
'''月典最初從月之符文開始，之後逐步形成脈絡、作品與多元體系、方法論、演算法（知識庫）與時間中的推演。''',
'''月典最初從月之符文開始，之後逐步形成脈絡、音樂、文字創作、多媒體、演算法、演算模組與時間中的推演。'''
)

old_detail = '''      <div class="framework-detail">
        <div class="kicker" id="framework-detail-kicker">LOC1 · LunaRunes</div>
        <h3 id="framework-detail-title">月之符文</h3>
        <p id="framework-detail-copy"></p>
        <ul class="framework-extra" id="framework-detail-extra"></ul>
        <div class="framework-detail-links" id="framework-detail-links"></div>
      </div>'''

new_detail = '''      <div class="framework-detail" id="framework-detail-host">
        <section data-loc-detail="LOC1">
          <div class="kicker">LOC1 · LunaRunes</div>
          <h3>月之符文</h3>
          <p>由 66 個中文單一字構成的符號式語言模組。符文、群組、方向與抽取結構共同形成可閱讀、可比較、可組合的語意方式。</p>
          <ul class="framework-extra">
            <li>66 個月之符文構成固定語意骨架。</li>
            <li>四向描述同一符文在不同狀態下的表現。</li>
            <li>單卡、雙卡、三卡、五卡與 OW3gs 使用不同組合語法。</li>
            <li>月之符文是 LOC 的起點，但不是使用 LOC 的門檻。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="runes.html">月之符文 →</a></div>
        </section>
        <section data-loc-detail="LOC2" hidden>
          <div class="kicker">LOC2 · Context</div>
          <h3>脈絡</h3>
          <p>把語彙、作品、事件與概念放進關係與情境中，讓單一內容能和前後文、其他節點與事件一起被理解。</p>
          <ul class="framework-extra">
            <li>Graph／關係圖呈現節點與連結。</li>
            <li>Context／脈絡補上語意所處的情境。</li>
            <li>事件與關係可被搜尋、比較與重新連結。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="context.html">脈絡 →</a></div>
        </section>
        <section data-loc-detail="LOC3" hidden>
          <div class="kicker">LOC3 · Music</div>
          <h3>音樂</h3>
          <p>把歌詞、曲風、作品與創作時期納入語言資料，使聲音作品可以被搜尋、比較並和其他文本建立連結。</p>
          <ul class="framework-extra">
            <li>歌詞是可分析的文本資料。</li>
            <li>曲風與 hashtag 可作為直接標籤統計。</li>
            <li>作品可和文字、多媒體、時期與脈絡交叉分析。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="search.html">搜尋音樂 →</a></div>
        </section>
        <section data-loc-detail="LOC4" hidden>
          <div class="kicker">LOC4 · Literary</div>
          <h3>文字創作</h3>
          <p>保存與分析小說、文章、散文及其他文字作品，並保留來源、版本、發表與改寫之間的關係。</p>
          <ul class="framework-extra">
            <li>原始文本與後續版本可以分開治理。</li>
            <li>同一主題可跨作品與時期持續發展。</li>
            <li>文字內容可進一步進入搜尋、脈絡與推演。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="search.html">搜尋文字 →</a></div>
        </section>
        <section data-loc-detail="LOC5" hidden>
          <div class="kicker">LOC5 · Multimedia</div>
          <h3>多媒體</h3>
          <p>把語言延伸到圖像、影音與其他媒介，觀察同一概念如何在文字、聲音與畫面之間轉換與重組。</p>
          <ul class="framework-extra">
            <li>包含圖像、Reels、影片、MV 與系統視覺化。</li>
            <li>多媒體不是單純素材分類，而是跨媒介語意表達。</li>
            <li>同一概念可以同時存在文字、音樂與影像版本。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="search.html">搜尋多媒體 →</a></div>
        </section>
        <section data-loc-detail="LOC6" hidden>
          <div class="kicker">LOC6 · Algorithm</div>
          <h3>演算法</h3>
          <p>把語言治理原則轉成可重複判斷與處理的規則，負責分類、比較、排序、判定與其他可解釋的處理流程。</p>
          <ul class="framework-extra">
            <li>Algorithm／演算法描述系統如何做出可重複的判斷。</li>
            <li>治理原則先確定，再轉成可執行規則。</li>
            <li>可採無 API 的確定性分類，也可接入其他技術。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="governance.html">演算法與治理 →</a></div>
        </section>
        <section data-loc-detail="LOC7" hidden>
          <div class="kicker">LOC7 · Module</div>
          <h3>演算模組</h3>
          <p>把演算法、資料來源與介面組成可重複使用的功能模組，讓搜尋、分類、關聯與分析可以獨立組裝與延伸。</p>
          <ul class="framework-extra">
            <li>Module／模組負責封裝可重用的演算能力。</li>
            <li>Search、RAG、Graph 與分類器可作為不同模組實作。</li>
            <li>模組可被替換、組合與重用，不綁定單一模型或 API。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="search.html">查看模組實作 →</a></div>
        </section>
        <section data-loc-detail="LOC8" hidden>
          <div class="kicker">LOC8 · Evolution</div>
          <h3>推演</h3>
          <p>把語言、作品與事件放回時間中比較，觀察不同時期的差異、趨勢與變化路徑，再把新結果帶進下一輪分析。</p>
          <ul class="framework-extra">
            <li>Period／時期區分相對穩定的狀態。</li>
            <li>Timeline／時間線定位事件與作品。</li>
            <li>Trend／趨勢比較不同時期的變化。</li>
            <li>Trajectory／軌跡描述狀態如何一路轉變。</li>
            <li>推演建立在既有資料上，不等於預言。</li>
          </ul>
          <div class="framework-detail-links"><a class="framework-detail-link" href="evolution.html">推演 →</a></div>
        </section>
      </div>'''

if old_detail not in s:
    raise SystemExit('framework detail host not found')
s = s.replace(old_detail, new_detail, 1)

# Remove fixed copy from JS; JS now only switches static HTML panels.
pattern = re.compile(r'''\n      const kicker = document\.querySelector\('#framework-detail-kicker'\);.*?\n      function render\(key\)\{.*?\n      \}\n\n      let lastFrameworkTrigger''', re.S)
replacement = '''
      const detailPanels = [...document.querySelectorAll('[data-loc-detail]')];

      function render(key){
        const wanted = key || 'LOC1';
        detailPanels.forEach(panel => { panel.hidden = panel.dataset.locDetail !== wanted; });
        document.querySelectorAll('.framework-tab').forEach(btn=>{
          btn.classList.toggle('active',btn.dataset.locKey===wanted);
        });
      }

      let lastFrameworkTrigger'''
s, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('locInfo/render JS block not found')

p.write_text(s, encoding='utf-8')
