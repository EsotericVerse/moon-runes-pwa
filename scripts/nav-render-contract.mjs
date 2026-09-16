import fs from 'node:fs';
const global=fs.readFileSync('app/GlobalNav.jsx','utf8');
const scope=fs.readFileSync('app/ScopeNav.jsx','utf8');
if(!global.includes("import ScopeNav from './ScopeNav'" )||!global.includes('<ScopeNav />'))throw new Error('Global NAV bypasses Scope resolver');
if(!scope.includes("from './nav-route-map'"))throw new Error('Scope NAV bypasses route map');
console.log('Centralized NAV rendering verified.');
