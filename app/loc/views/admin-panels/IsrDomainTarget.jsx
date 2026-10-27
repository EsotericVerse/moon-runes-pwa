'use client';

import {CACHE_POLICY} from '../../cache-policy.config.mjs';
import {CACHE_MODE_OPTIONS} from '../../cache-mode-client.mjs';

// Read-only view. Cache mode and ISR domains live in app/loc/cache-policy.config.mjs;
// change them there and redeploy. This panel never writes to a database.
export default function IsrDomainTarget(){
  const {mode,provider,domains}=CACHE_POLICY;
  const modeLabel=CACHE_MODE_OPTIONS.find(item=>item.value===mode)?.label||mode;
  const selected=domains.find(item=>item.id===provider);
  return <section className="loc-card admin-workspace">
    <h2>快取</h2>
    <p className="scope-status">目前全站快取策略由 app/loc/cache-policy.config.mjs 設定（唯讀顯示）。修改設定檔後需重新部署才會生效。</p>
    <div className="scope-management-fields">
      <span>目前全站快取策略：{modeLabel}（{mode}）</span>
      <span>目前選用的 ISR：{selected?`${selected.label}（${selected.origin}）`:'未設定'}</span>
    </div>
    <h3>ISR Domain 清單（{domains.length}）</h3>
    <ul className="scope-status">
      {domains.map(item=><li key={item.id}>{item.label}：{item.origin}{item.id===provider?'（目前選用）':''}</li>)}
    </ul>
  </section>;
}
