# LOC Hero page_name repair — 2026-10-26

## Canonical Trace Hero: retain group_trace

- `group_trace` UID `BRP7JEFQ`, order 1, eyebrow `Trace`, title `痕跡`, text `<p>文字在真實的立體場景出現的痕跡</p>`, image `https://loc.lo3rwang.cc/pics/LOC-gn.jpg`. **Keep.**
- Former `group_governance` UID `997BFF13`, order 1, eyebrow `Trace`, title `痕跡`, text `<p><strong>文字</strong>在<u>真實的立體街景</u>出現的痕跡</p><p><br></p>`, same image. **Remove only this duplicate after all dependent code routes and static snapshots are moved.** This file preserves the old row for manual rollback, not as a runtime fallback.

## group_manage legacy rows — original mapping

All original rows were in `silver.loc_blocks` with `page_name=group_manage`:

| Old order | UID | Title | Destination |
|---|---|---|---|
| 1 | E090E4CA | 頁面控管 | Legacy: retain pending explicit content reconciliation |
| 2 | MGHERO02 | 時間定錨 | TimeAnchor |
| 3 | MGHERO03 | 關鍵詞 | ScopeKeyword |
| 4 | MGHERO04 | 空間定錨 | SpaceAnchor |
| 5 | MGHERO05 | 進階搜尋 | ScopeAdvSearch |
| 6 | MGHERO06 | 系統管理 | Legacy duplicate: retain pending explicit content reconciliation |
| 7 | MGHERO07 | 人員作品管理 | GalaxyManage |
| 8 | MGHERO08 | 關鍵詞 | Groupkeyword |
| 9 | MGHERO09 | 痕跡圖管理 | GroupSpace |
| 10 | MGHERO10 | 文章管理 | GroupArticle |

Old group_manage order 1 full text: `<p><strong>成員</strong>頁面設定選單，也掌管<strong>匯入</strong>。</p>`.
Old order 6 and all other management entries had empty body/eyebrow/subtitle as verified prior to migration.
Each moved record preserves UID, title, text, subtitle, entities, and the per-row image. New English eyebrow is assigned only where empty.
Shared image owners remain `scope_admin` for Admin and `scope_manage` for Scope; no image tables are introduced.

**No Cloudflare/ISR deploy is authorized by this record.**
