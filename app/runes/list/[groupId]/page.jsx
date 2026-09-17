import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { notFound } from 'next/navigation';
import { LOC_DATA } from '../../../loc/data-paths.mjs';

const readJson = publicPath => JSON.parse(readFileSync(resolve(process.cwd(), publicPath.replace(/^\//, '')), 'utf8'));
const groupAuthority = readJson(LOC_DATA.RUNE_GROUPS);
const runeRows = readJson(LOC_DATA.RUNES);

export function generateStaticParams() {
  return groupAuthority.groups.map(group => ({ groupId: group.id }));
}

export default async function RuneGroupPage({ params }) {
  const { groupId } = await params;
  const group = groupAuthority.groups.find(item => item.id === groupId);
  if (!group) notFound();
  const rowsById = new Map(runeRows.map(row => [Number(row.編號), row]));

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">{group.group_en} · Rune Group</p>
      <h1>{group.group_zh}組</h1>
      <p className="loc-subtitle">此路徑直接由 Core Group Spec 的 <code>groups[].id</code> 產生。</p>
    </header>
    <nav className="loc-card"><a href="/runes/list">返回所有符文列表</a></nav>
    <section className="loc-card">
      <div className="loc-context-list">
        {group.runes.map(member => {
          const row = rowsById.get(Number(member.id));
          return <article className="loc-context-item" key={member.id}>
            <strong>{String(member.id).padStart(2, '0')} · {member.zh} · {member.en}</strong>
            {row && <span>{row.符文說明}</span>}
          </article>;
        })}
      </div>
    </section>
  </section></main>;
}
