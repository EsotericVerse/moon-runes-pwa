import fs from 'node:fs';if(fs.readFileSync('scripts/nav-pr-ready.txt','utf8').trim()!=='READY')throw new Error('NAV patch not marked ready');console.log('NAV patch marked ready.');
