import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={
  title:'Admin｜LOC 月典',
  robots:{index:false,follow:false}
};

const modules=[
  ['Route / Page Registry','/admin/routes'],
  ['Domain Registry','/admin/domains'],
  ['Source Registry','/admin/sources'],
  ['Content / Authorship','/admin/content'],
  ['Projection Registry','/admin/projection'],
  ['Audit Registry','/admin/audit']
];

export default function AdminPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Admin</p>
      <h1>全站管理</h1>
      <div className="links">{modules.map(([label,href])=><a key={href} href={href}>{label}</a>)}</div>
    </header>
    <GovernanceManagement/>
  </main>;
}
