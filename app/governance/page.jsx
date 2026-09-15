import LocApp from '../loc/LocApp';
export const metadata={title:'治理｜LOC 月典'};

export default function GovernancePage(){
  return <>
    <section className="loc-view" aria-label="LOC 治理理念">
      <section className="loc-card">
        <p className="loc-eyebrow">Governance · 治理</p>
        <h2>治理</h2>
        <p className="loc-subtitle">每個文化有每個不同的治理。</p>
        <p>治理頁集中呈現與索引不同文化、系統與作者脈絡中已經存在的治理理念、規則與歷史。把內容放在這裡，是為了方便查閱與比較，不代表這些內容從屬於 Governance，也不建立新的架構層級。</p>
        <p>LOC 面對其他文化時，先辨識該文化自己的語言、脈絡、規則、歷史與治理，再保存來源、差異與演變。LOC 不以 LunaRunes 或自身 Canon 判定其他文化的對錯、有效無效或優劣；沒有既定治理時，以描述、來源與不確定性為主，不替該文化創造規則。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h3>LunaRunes 治理</h3>
        <p>LunaRunes 有自己的 Canon 與固定資料邊界。現行正式定義優先於舊版顯示；歷史演變仍保留來源與版本，不因正名或修正而抹除。</p>
        <p>Base66／母資料是現行固定語彙的權威來源，公開功能與衍生分析只讀取它，不由抽牌、搜尋、Graph、統計或其他 View 反向改寫。LunaRunes 內部可依自己的 Canon 檢查術語、資料與衍生結果是否受到舊版污染。</p>
        <p>語意分析先看詞性與句內語意角色，再看群組主體性與符文歸屬；No API、可解釋分類優先。分類與推演是 LunaRunes 的語意投影，不是對來源文化本身的價值判斷。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Author Context · 作者脈絡</p>
        <h3>作者治理</h3>
        <p>作者身份、名稱、創作風格、作品版本、公開連結與合作界線屬於作者自己的治理脈絡。作者個人的思想、生活經驗與創作偏好，與 LOC 的系統治理分開保存；兩者可以互相說明來源，但不視為同一件事。</p>
        <p>名稱與定義發生變化時，保留歷史並標示現行定位；公開頁使用目前正式身份與對外資訊，不讓舊名稱或舊定義覆蓋現行資料。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Open Core · 開放與延伸</p>
        <h3>使用與延伸</h3>
        <p>LOC 與 LunaRunes 的部分核心採開放與 Copyleft 思路，允許理解、研究與延伸；引用既有 LunaRunes 資料時應保留來源與標注。衍生系統可以建立自己的文化與治理，但不應把衍生定義回寫成 LunaRunes 的現行 Canon。</p>
        <p>顧問判斷、架構設計、資料整理、解析介面、系統實作、個案研究與持續治理屬於專業實作範圍。</p>
      </section>
    </section>
    <LocApp/>
  </>;
}
