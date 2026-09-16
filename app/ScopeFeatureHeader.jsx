import {featurePage} from './scope-feature-model';

export default function ScopeFeatureHeader({scope,feature}){
 const page=featurePage(scope,feature);
 return <header className="loc-hero" data-scope={page.scope.id} data-feature={feature}>
  <p className="loc-eyebrow">{page.scope.enName} · {page.feature.name}</p>
  <h1>{page.title}</h1>
  <p className="loc-subtitle">{page.description}</p>
 </header>;
}
