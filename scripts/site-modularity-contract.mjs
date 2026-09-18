import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const provider=read('app/SiteScopeProvider.jsx');
const registry=read('app/site-registry.js');
const consumers=[
  'app/ScopeNav.jsx',
  'app/GlobalFooter.jsx',
  'app/ThemeSelect.jsx',
  'app/loc/views/SearchView.jsx',
  'app/loc/views/ContextView.jsx',
  'app/loc/views/StaticsView.jsx'
];

for(const path of consumers){
  const source=read(path);
  if(!source.includes('useSiteScope'))throw new Error(path+' must consume SiteScopeProvider');
  if(source.includes('window.location.hostname')||source.includes('detectSiteScope('))throw new Error(path+' must not independently resolve scope');
}
for(const token of ['scope','current','origin','route:','dataView:']){
  if(!provider.includes(token))throw new Error('SiteScopeProvider missing shared runtime field: '+token);
}
for(const token of ['searchCollection','dataViews','reserved','role','homes','theme']){
  if(!registry.includes(token))throw new Error('site-registry missing modular scope field: '+token);
}
console.log('Full-site shared scope modularity contract verified.');
