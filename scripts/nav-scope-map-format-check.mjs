import fs from 'node:fs';
JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
JSON.parse(fs.readFileSync('scripts/nav-contract-version.json','utf8'));
JSON.parse(fs.readFileSync('scripts/nav-implementation-status.json','utf8'));
console.log('NAV JSON contracts parse successfully.');
