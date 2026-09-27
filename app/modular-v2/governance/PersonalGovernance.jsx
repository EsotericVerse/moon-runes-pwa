export const PERSONAL_GOVERNANCE_SUBTITLE='個人治理、作品與作者權利。管理也在此。';

export default function PersonalGovernance(){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">Personal Governance</p>
        <h2>個人治理</h2>
        <p>私人領域，用來管理個人資料、作品、公開文字與創作軌跡。</p>
        <p>LOC 可以整理、搜尋與呈現這些資料，但不因資料進入 LOC，就改變原作品的作者權利或個別授權條件。</p>
      </section>
      <section className="loc-card" id="rights">
        <p className="loc-eyebrow">Copyright · Personal Works</p>
        <h2>基本著作權保護</h2>
        <p>個人文字、歌曲、小說、多媒體與其他原創作品採一般 <strong>Copyright／著作權</strong> 保護。</p>
        <p>這些作品與資料不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL；除非作品另有明示授權，否則仍依原作者權利與個別作品條件處理。</p>
        <p>此內容可作為新一般個人的初始治理範本；建立後即成為該使用者的獨立副本，可由該使用者自行修改。</p>
      </section>
    </div>
  </>;
}
