'use client';

import {FeaturePage} from '../../modular/ui';

export default function LocalSettingView(){
  return <FeaturePage featureId="setting">
    <section className="loc-card scope-feature-card">
      <p className="scope-status">本機資料的匯入／匯出／清除功能尚未實作，目前只有頁面版型。</p>
    </section>
  </FeaturePage>;
}
