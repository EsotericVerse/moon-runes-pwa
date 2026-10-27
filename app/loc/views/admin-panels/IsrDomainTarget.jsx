'use client';

import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {CACHE_MODE_OPTIONS} from '../../cache-mode-client.mjs';

// Read-only view. Cache mode and ISR domains live in app/loc/cache-policy.config.mjs;
// change them there and redeploy. This panel never writes to a database.
export default function IsrDomainTarget(){
  const {mode,provider,domains}=CACHE_POLICY;
  const modeLabel=CACHE_MODE_OPTIONS.find(item=>item.value===mode)?.label||mode;
  const selected=domains.find(item=>item.id===provider);
  const isrActive=mode==='isr'&&Boolean(selected?.origin)&&Boolean(CACHE_POLICY.origin);
  return <section className="loc-card admin-workspace">
    <h2>快取</h2>
    <p className="scope-status">設定位於 app/loc/cache-policy.config.mjs。修改後需重新部署才會生效。</p>
    <dl className="scope-management-fields">
      <dt>快取模式</dt>
      <dd>{modeLabel}（{mode}）</dd>
      <dt>ISR 狀態</dt>
      <dd>{isrActive?`開啟，使用 ${selected.label}（${selected.origin}）`:'未開啟（origin 未設定）'}</dd>
    </dl>
    <h3>ISR 網域（{domains.length}）</h3>
    <ul className="scope-status">
      {domains.map(item=><li key={item.id}>{item.label}：{item.origin}</li>)}
    </ul>
  </section>;
}
