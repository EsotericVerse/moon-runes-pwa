'use client';

import {FeaturePage} from '../../modular/ui';

// Page layout only for now (featureId="setting", same FeaturePage template as
// the other feature pages -- hero text only, no control inside it). The
// actual 本機SQLite資料管理（匯入/匯出/清除本機資料）behaviour is not wired
// up yet; local-sqlite.mjs currently exposes no import/export/clear-all
// entry points to call. This placeholder says so plainly rather than
// shipping buttons that would not do anything.
export default function LocalSettingView(){
  return <FeaturePage featureId="setting">
    <section className="loc-card scope-feature-card">
      <p className="scope-status">本機資料的匯入／匯出／清除功能尚未實作，目前只有頁面版型。</p>
    </section>
  </FeaturePage>;
}
