'use client';

import PageShellV2,{ScopeCardV2} from './PageShellV2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function GenericScopeHomeV2(){
  const {scope}=useScopeRuntimeV2();

  return <PageShellV2
    eyebrow="Scope"
    title={scope.label}
    subtitle="此 Scope 使用共用頁面框架；內容、canonical 資料與導覽由 Current Scope Registry 提供。"
  >
    <ScopeCardV2 eyebrow="Primary" title={scope.primary.label}>
      <p><a href={scope.primary.href}>進入主要內容</a></p>
    </ScopeCardV2>

    <ScopeCardV2 eyebrow="Role" title={scope.role.label}>
      <p><a href={scope.role.href}>查看管理／角色入口</a></p>
    </ScopeCardV2>

    {scope.homes?.length?<ScopeCardV2 eyebrow="Home" title="返回入口">
      <p>{scope.homes.map((item,index)=><span key={item.label}>{index?' · ':''}<a href={item.href}>{item.label}</a></span>)}</p>
    </ScopeCardV2>:null}
  </PageShellV2>;
}
