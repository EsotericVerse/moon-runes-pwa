export const metadata={title:'符文搜尋｜月之符文'};
export default function RuneSearchPage({searchParams}){const q=searchParams?.q||'';return <main className="loc-next-main"><section className="loc-card"><h1>符文搜尋</h1>{q?<p>搜尋「{q}」時只使用月之符文 Scope 的資料。</p>:<p>搜尋範圍限定為月之符文 Scope。</p>}</section></main>}
