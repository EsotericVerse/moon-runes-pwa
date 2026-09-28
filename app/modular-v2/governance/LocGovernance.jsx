import EditableContentBlockV2 from '../EditableContentBlockV2';

export const LOC_GOVERNANCE_SUBTITLE='LOC 原則、Copyleft 與 GNU GPL。管理也在此。';

export function LocGovernanceLaw({canEdit=false}){
  return <div className="loc-grid two">
    <EditableContentBlockV2
      scopeId="loc"
      pageKey="governance"
      slotKey="copyright"
      id="copyright"
      eyebrow="Copyleft · GNU GPL"
      title="LOC 授權"
      body={"LOC 採 Copyleft 原則；LOC 的原創程式碼採 GNU GPL 授權。\nLOC 的方法、架構與可授權內容可以被研究、使用與延伸，但應保留來源、作者、修改歷史與必要的衍生標示。\n這個授權邊界只屬於 LOC，不自動涵蓋 LunaRunes、個人內容、第三方內容、私人資料或另有權利條件的資產。\nGNU GPL 的正式版本將以 Repository 的 LICENSE 文件為準；在 LICENSE 尚未明定前，不自行推定特定 GPL 版本。"}
      displayOrder={3}
      canEdit={canEdit}
    >
      <p>LOC 採 <strong>Copyleft</strong> 原則；LOC 的原創程式碼採 <strong>GNU GPL</strong> 授權。</p>
      <p>LOC 的方法、架構與可授權內容可以被研究、使用與延伸，但應保留來源、作者、修改歷史與必要的衍生標示。</p>
      <p>這個授權邊界只屬於 LOC，不自動涵蓋 LunaRunes、個人內容、第三方內容、私人資料或另有權利條件的資產。</p>
      <p>GNU GPL 的正式版本將以 Repository 的 LICENSE 文件為準；在 LICENSE 尚未明定前，不自行推定特定 GPL 版本。</p>
    </EditableContentBlockV2>
    <EditableContentBlockV2
      scopeId="loc"
      pageKey="governance"
      slotKey="documents"
      id="documents"
      eyebrow="Documents"
      title="文件"
      body={"Repository 文件入口：README、Copyleft 與 GPL 授權文件由 Repository 統一管理。\nLOC Canon：LOC 現行架構、定義與治理基準。"}
      displayOrder={4}
      canEdit={canEdit}
    >
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Repository 文件入口</a>：README、Copyleft 與 GPL 授權文件由 Repository 統一管理。</p>
      <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：LOC 現行架構、定義與治理基準。</p>
    </EditableContentBlockV2>
  </div>;
}

export default function LocGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two">
      <EditableContentBlockV2
        scopeId="loc"
        pageKey="governance"
        slotKey="principles"
        id="principles"
        eyebrow="LOC Principles"
        title="原則"
        body={"尊重 · 和平 · 包容 · 友善\nLOC 本身保持客觀與中立。它整理語言、資料、脈絡與時間，但不替使用者決定立場、身份或人生選擇。\nLOC 可以被使用、比較、延伸，也可以完全不用；系統提供的是架構與方法，不是唯一答案。\n歷史保留，解釋可校準。事件、來源與版本保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。"}
        displayOrder={1}
        canEdit={canEdit}
      >
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 本身保持客觀與中立。</strong>它整理語言、資料、脈絡與時間，但不替使用者決定立場、身份或人生選擇。</p>
        <p>LOC 可以被使用、比較、延伸，也可以完全不用；系統提供的是架構與方法，不是唯一答案。</p>
        <p><strong>歷史保留，解釋可校準。</strong>事件、來源與版本保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。</p>
      </EditableContentBlockV2>
      <EditableContentBlockV2
        scopeId="loc"
        pageKey="governance"
        slotKey="scope-boundary"
        id="scope-boundary"
        eyebrow="Governance Boundary"
        title="治理邊界"
        body={"各區域擁有自己的資料與治理權。不同區域可以引用、連結與比較，但不因此取得對方治理權。\nLOC 提供治理能力與管理框架，不替其他區域決定著作權、授權方式或法律立場。"}
        displayOrder={2}
        canEdit={canEdit}
      >
        <p>各區域擁有自己的資料與治理權。不同區域可以引用、連結與比較，但不因此取得對方治理權。</p>
        <p>LOC 提供治理能力與管理框架，不替其他區域決定著作權、授權方式或法律立場。</p>
      </EditableContentBlockV2>
    </div>
    <LocGovernanceLaw canEdit={canEdit}/>
  </>;
}
