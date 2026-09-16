import fs from 'node:fs';
const scope=fs.readFileSync('app/ScopeNav.jsx','utf8');
if(!scope.includes("action={navRoute(cfg,'search')}"))throw new Error('Search does not inherit active Scope');
if(!scope.includes('type="search"')||!scope.includes('>搜尋</button>'))throw new Error('NAV search input/button missing');
console.log('Scoped NAV search verified.');
