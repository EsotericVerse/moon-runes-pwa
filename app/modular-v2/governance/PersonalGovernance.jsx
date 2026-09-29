import EditableContentBlockV2 from '../EditableContentBlockV2';

export const PERSONAL_GOVERNANCE_SUBTITLE='個人治理、作品與作者權利。管理也在此。';

export default function PersonalGovernance({canEdit=false}){
  return <div className="loc-grid two">
    <EditableContentBlockV2
      scopeId="lo3rwang"
      pageKey="governance"
      slotKey="principles"
      id="principles"
      eyebrow="Personal Governance"
      title="個人治理"
      body={"私人領域，用來管理個人資料、作品、公開文字與創作軌跡。\nLOC 可以整理、搜尋與呈現這些資料，但不因資料進入 LOC，就改變原作品的作者權利或個別授權條件。"}
      displayOrder={1}
      canEdit={canEdit}
    >
      <p>私人領域，用來管理個人資料、作品、公開文字與創作軌跡。</p>
      <p>LOC 可以整理、搜尋與呈現這些資料，但不因資料進入 LOC，就改變原作品的作者權利或個別授權條件。</p>
    </EditableContentBlockV2>
    <EditableContentBlockV2
      scopeId="lo3rwang"
      pageKey="governance"
      slotKey="analysis-baseline"
      id="analysis-baseline"
      eyebrow="Personal Analysis Baseline"
      title="個人分析與 AI 定錨"
      body={"本個人 Scope 以 2023-01-01 作為 AI 判定的預設定錨點。建立個人 Scope 時，同時設定使用者的生日時間錨點與 AI 分析錨點；生日與 AI 錨點皆屬個人分析設定，建立後可由使用者自行修改。2022-12-31 以前的文字，在沒有相反證據時視為人工原始文字；2023-01-01 起若沒有明確來源證據，只視為可能受 AI 介入，不直接判定為 AI 生成。\n個人原稿、手稿、原始貼文與可追溯版本紀錄優先於日期預設；明確的 AI 輔助文字、AI 生成文字則分開標示，不與原始人工文字混為同一來源。\n本 Scope 的個人風格分析以可確認為本人原始文字的資料作為主要基線。轉錄、轉貼、引用與來源未知文字可保留在資料脈絡中，但預設不作為本人原始風格的核心樣本；是否納入其他分析，由本 Scope 治理決定。\n生日與 AI 定錨只用來產生分析時期，不會修改原始作品日期、來源時間或 provenance。分析定錨可以設定在生日之前，但個人文字解析不會早於生日；實際分析起點取生日與分析定錨中較晚者。若 AI 定錨早於生日，則從生日開始視為 AI 可能介入時期。此規則同時作為一般個人 Scope 的治理範本。其他 Scope 建立後可自行修改自己的定錨點、轉錄採計與分析規則，不因此改變 LOC 的共同治理。"}
      displayOrder={2}
      canEdit={canEdit}
    >
      <p>本個人 Scope 以 <strong>2023-01-01</strong> 作為 AI 判定的預設定錨點。建立個人 Scope 時，同時設定使用者的生日時間錨點與 AI 分析錨點；兩者皆屬個人分析設定，建立後可由使用者自行修改。2022-12-31 以前的文字，在沒有相反證據時視為人工原始文字；2023-01-01 起若沒有明確來源證據，只視為可能受 AI 介入，不直接判定為 AI 生成。</p>
      <p>個人原稿、手稿、原始貼文與可追溯版本紀錄優先於日期預設；明確的 AI 輔助文字、AI 生成文字則分開標示，不與原始人工文字混為同一來源。</p>
      <p>本 Scope 的個人風格分析以可確認為本人原始文字的資料作為主要基線。轉錄、轉貼、引用與來源未知文字可保留在資料脈絡中，但預設不作為本人原始風格的核心樣本；是否納入其他分析，由本 Scope 治理決定。</p>
      <p>生日與 AI 定錨只用來產生分析時期，不會修改原始作品日期、來源時間或 provenance。分析定錨可以設定在生日之前，但個人文字解析不會早於生日；實際分析起點取生日與分析定錨中較晚者。若 AI 定錨早於生日，則從生日開始視為 AI 可能介入時期。此規則同時作為一般個人 Scope 的治理範本。其他 Scope 建立後可自行修改自己的定錨點、轉錄採計與分析規則，不因此改變 LOC 的共同治理。</p>
    </EditableContentBlockV2>
    <EditableContentBlockV2
      scopeId="lo3rwang"
      pageKey="governance"
      slotKey="rights"
      id="rights"
      eyebrow="Copyright · Personal Works"
      title="基本著作權保護"
      body={"個人文字、歌曲、小說、多媒體與其他原創作品採一般 Copyright／著作權 保護。\n這些作品與資料不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL；除非作品另有明示授權，否則仍依原作者權利與個別作品條件處理。\n此內容可作為新一般個人的初始治理範本；建立後即成為該使用者的獨立副本，可由該使用者自行修改。"}
      displayOrder={3}
      canEdit={canEdit}
    >
      <p>個人文字、歌曲、小說、多媒體與其他原創作品採一般 <strong>Copyright／著作權</strong> 保護。</p>
      <p>這些作品與資料不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL；除非作品另有明示授權，否則仍依原作者權利與個別作品條件處理。</p>
      <p>此內容可作為新一般個人的初始治理範本；建立後即成為該使用者的獨立副本，可由該使用者自行修改。</p>
    </EditableContentBlockV2>
  </div>;
}
