import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const LOC_GOVERNANCE_SUBTITLE='說明月典的使用原則、權利邊界與管理方式。';

export default function LocGovernance(){
  return <ScopeEditableBlocks
    scopeId="loc"
    page="governance"
    className="loc-grid two governance-grid governance-grid-loc"
    headingLevel={2}
    fallbackDocuments={[
      [
        {type:'heading',props:{level:2},content:'治理原則'},
        {type:'paragraph',content:'尊重 · 和平 · 包容 · 友善'},
        {type:'paragraph',content:'月典用來整理、搜尋、統計與呈現文字、作品和時間脈絡，但不替使用者決定立場、身份或人生選擇。'},
        {type:'paragraph',content:'系統提供的是整理與理解資料的方法，不是唯一答案。資料可以被重新比較與理解，但原始紀錄、來源與版本應盡量保留。'}
      ],
      [
        {type:'heading',props:{level:2},content:'治理邊界'},
        {type:'paragraph',content:'不同資料區域可以互相引用、連結與比較，但各自保有自己的內容、權利與管理責任。'},
        {type:'paragraph',content:'月典提供共同的整理框架，不替其他區域決定著作權、授權方式或法律立場。'}
      ],
      [
        {type:'heading',props:{level:2},content:'月典與月之符文'},
        {type:'paragraph',content:'月典（LOC）是語言架構框架，用來整理、歸類與呈現資料；月之符文（LunaRunes）則是一套獨立的符號式語言宇宙。'},
        {type:'paragraph',content:'兩者可以互相參照，但不互相依賴。使用月典不必使用月之符文；使用月之符文，也不必限定在月典裡。'}
      ],
      [
        {type:'heading',props:{level:2},content:'來源與判讀'},
        {type:'paragraph',content:'月典可以記錄來源、作者標示、版本與 AI 介入等資訊，作為整理與分析的依據，但不以這些標記直接裁決真正作者、著作權歸屬或內容真偽。'},
        {type:'paragraph',content:'資料不足時保留未知，不自行猜測。轉錄、轉貼或來源不明的內容可以保留在脈絡中，再由各區域決定是否納入特定分析。'},
        {type:'paragraph',content:'時間、事件、多媒體、來源與地點都可以成為脈絡的一部分；月典只呈現紀錄與關係，不替使用者解釋其心理或人生意義。'}
      ]
    ]}
  />;
}
