import fs from 'node:fs';

const routeMapSource=fs.readFileSync('app/nav-route-map.js','utf8');
const scopeNav=fs.readFileSync('app/ScopeNav.jsx','utf8');
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const runtime=await import(`data:text/javascript;base64,${Buffer.from(routeMapSource).toString('base64')}`);

for(const fn of map.sharedFunctions){
  const names=runtime.SHARED_NAV_FUNCTIONS.map(([,name])=>name);
  if(fn==='search'){
    if(!scopeNav.includes("navRoute(cfg,'search')"))throw new Error('Runtime NAV missing shared function: search');
  }else if(!names.includes(fn))throw new Error(`Runtime NAV missing shared function: ${fn}`);
}

for(const [scope,cfg] of Object.entries(map.scopes)){
  const host=cfg.host||(cfg.hosts?.[0]||'');
  const runtimeCfg=runtime.getNavScopeConfig(scope,host);
  if(runtimeCfg.reserved[0]!==cfg.reserved.label)throw new Error(`Runtime NAV missing ${scope} reserved entry`);
  for(const item of [...(cfg.role||[]),...(cfg.homes||[])]){
    const links=[...(runtimeCfg.role||[]),...(runtimeCfg.homes||[])];
    if(!links.some(([label,href])=>label===item.label&&href===item.href))throw new Error(`Runtime NAV missing ${scope} link: ${item.label}`);
  }
}

for(const test of map.scopeCases||[]){
  const actual=runtime.detectNavScope(test.pathname,test.host);
  if(actual!==test.scope)throw new Error(`Scope route mismatch: ${test.host}${test.pathname} => ${actual}, expected ${test.scope}`);
}

for(const test of map.routeCases||[]){
  const cfg=runtime.getNavScopeConfig(test.scope,test.host);
  const actual=runtime.navRoute(cfg,test.feature);
  if(actual!==test.href)throw new Error(`Feature route mismatch: ${test.scope} × ${test.feature} => ${actual}, expected ${test.href}`);
}

console.log('Runtime/declarative NAV maps and Scope × Feature routes aligned.');
