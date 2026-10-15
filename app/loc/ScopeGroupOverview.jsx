'use client';

import {useQuery} from '@tanstack/react-query';
import UiText,{useUiText} from '../i18n/UiText';
import {selectScopeGroupChildren} from './scope-data';
import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';

const FEATURE_PATH=Object.freeze({search:'search',statics:'statics',culture:'culture',governance:'governance'});
const FEATURE_LABEL=Object.freeze({search:'nav.search',statics:'features.statics.title',culture:'features.culture.title',governance:'features.governance.title'});

export default function ScopeGroupOverview({scopeId='loc',featureId='search',title='',description=''}){
  const t=useUiText();
  const native=useNativeNavigation();
  const query=useQuery({
    queryKey:['scope-group-overview',scopeId],
    queryFn:()=>selectScopeGroupChildren(scopeId),
    staleTime:5*60_000
  });
  const scopes=query.data||[];
  const featurePath=FEATURE_PATH[featureId]||'';
  const featureLabel=t(FEATURE_LABEL[featureId]||'uiExtra.scopeGroup.unknownFeature');

  return <section className="scope-card scope-group-overview">
    <h2>{title||t('uiExtra.scopeGroup.directoryTitle')}</h2>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(row=><article className="scope-inline-card" key={row.scope_id}>
        <strong>{row.display_name||row.scope_id}</strong>
        <span>{row.domain||row.directory||'—'}</span>
        <div className="scope-result-links">
          <a href={navigationHref(row.scope_id,'',native)}><UiText id="uiExtra.scopeGroup.memberHome"/></a>
          {featurePath?<a href={navigationHref(row.scope_id,featurePath,native)}><UiText id="uiExtra.scopeGroup.openMemberFeature" params={{feature:featureLabel}}/></a>:null}
        </div>
      </article>)}
      {!query.isPending&&!query.error&&!scopes.length?<p className="scope-status"><UiText id="uiExtra.scopeGroup.noMembers"/></p>:null}
    </div>
  </section>;
}
