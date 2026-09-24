export const SCOPE_PAGE_PROFILES=Object.freeze({
  loc:Object.freeze({
    governance:Object.freeze({
      eyebrow:'LOC Governance',
      title:'治理',
      subtitle:'總覽 Current 原則、Scope 關係、權威邊界、授權與歷史。',
      intro:'LOC 提供共同治理方法與分類框架，但不取代 LunaRunes、Author 或 Admin 對自身資料的治理。',
      authority:'Current Canon → Scope Model × Feature Model → Page Composition',
      scopeTitle:'LOC 治理範圍',
      scopeText:'管理共同治理原則、Scope 邊界、Feature 契約、Current／Historical 分界與跨 Scope 規則。',
      links:Object.freeze([
        Object.freeze({href:'https://admin.lo3rwang.cc/',label:'治理管理',text:'管理 Scope、權限、公開設定與授權寫入。'}),
        Object.freeze({href:'https://lrunes.lo3rwang.cc/governance',label:'符文治理',text:'LunaRunes 的 Master Data、Grammar、語意與符文歷史。'}),
        Object.freeze({href:'https://dlwang.lo3rwang.cc/governance',label:'作者治理',text:'作者身份、政德風、作品脈絡、個人時期與作者歷史。'})
      ])
    })
  }),
  runes:Object.freeze({
    governance:Object.freeze({
      eyebrow:'LunaRunes Governance',
      title:'符文治理',
      subtitle:'只治理 LunaRunes／月之符文 Scope；共用 LOC 原則，但主體與權威獨立。',
      intro:'66 符身分、位置、Grammar、語意與符文歷史由 LunaRunes Scope 管理；抽牌、Graph、搜尋、統計與說明都是消費者。',
      authority:'LunaRunes Scope → Master Data／Base66 → Current Canon／Spec → Registry → Canonical tables',
      scopeTitle:'LunaRunes 治理範圍',
      scopeText:'管理 66 符母資料、符文語意、Grammar、抽牌規則、LunaRunes ERA 與符文歷史；衍生結果不得反向覆寫 Master Data。',
      links:Object.freeze([
        Object.freeze({href:'https://lrunes.lo3rwang.cc/',label:'月之符文首頁',text:'進入月之符文首頁，再前往符文圖鑑與抽牌。'}),
        Object.freeze({href:'https://loc.lo3rwang.cc/governance',label:'LOC 治理',text:'查看共同治理方法與跨 Scope 原則。'})
      ])
    })
  }),
  lo3rwang:Object.freeze({
    governance:Object.freeze({
      eyebrow:'Author Governance',
      title:'作者治理',
      subtitle:'管理作者身份、政德風、作品脈絡、個人時期與歷史。',
      intro:'作者可以治理自己的名稱、作品、風格、時期與公開自我描述；LOC 可以分析與索引，但不能把作者個人觀點自動升格為 LOC Canon。',
      authority:'Author Identity → 政德風 → Works／Keywords → ERA／History',
      scopeTitle:'作者治理範圍',
      scopeText:'管理作者身份、保留名稱、政德風、作品索引、文化關鍵字、作者 ERA、公開自我描述與相關歷史。',
      links:Object.freeze([
        Object.freeze({href:'https://dlwang.lo3rwang.cc/',label:'作者簡介',text:'返回作者 Current 首頁。'}),
        Object.freeze({href:'https://loc.lo3rwang.cc/governance',label:'LOC 治理',text:'查看共同治理方法與跨 Scope 原則。'})
      ])
    })
  }),
  admin:Object.freeze({
    governance:Object.freeze({
      eyebrow:'Admin Governance',
      title:'治理管理',
      subtitle:'管理 Scope、時期、資料納入、修正標記、權限與授權寫入。',
      intro:'Admin Scope 提供治理操作介面，不因此取得其他 Scope 的作者身分、資料所有權或內容代表權。',
      authority:'Admin → Review／Permission／Audit → Target Scope Authority',
      scopeTitle:'Admin 管理範圍',
      scopeText:'處理 Scope 設定、ERA 管理、資料納入審核、修正標記、授權寫入、稽核與系統層治理操作。',
      links:Object.freeze([
        Object.freeze({href:'https://admin.lo3rwang.cc/',label:'管理首頁',text:'回到治理管理入口。'}),
        Object.freeze({href:'https://loc.lo3rwang.cc/governance',label:'LOC 治理原則',text:'查看共同治理方法。'})
      ])
    })
  })
});

export function getScopePageProfile(scope,page){
  return SCOPE_PAGE_PROFILES[scope]?.[page]||SCOPE_PAGE_PROFILES.loc?.[page]||null;
}
