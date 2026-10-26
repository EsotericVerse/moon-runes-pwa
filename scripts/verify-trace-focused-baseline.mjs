import {readFileSync} from 'node:fs';

// The focused Trace suite includes only task-owned tests, not the broader
// Facebook import baseline. Do not accept a failed focused run as "known".
// The previous 73-case threshold was stale: a real run passed 69/69 yet failed
// this verifier (Actions run 40366077234).
const path=process.argv[2];
const exitCode=Number(process.argv[3]);
if(!path||![0,1].includes(exitCode))
  throw Error('Expected complete Node TAP log and its process exit status');
const log=readFileSync(path,'utf8');
const results=Object.fromEntries(['tests','pass','fail','cancelled','skipped']
  .map(label=>{
    const matches=[...log.matchAll(new RegExp('^.*?# '+label+' (\\d+)\\s*$','gm'))];
    return [label,matches.length?Number(matches.at(-1)[1]):NaN];
  }));
const failed=[...log.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map(m=>m[1].trim());
if(!Number.isInteger(results.tests)||results.tests<69
  ||results.pass!==results.tests||results.fail!==0
  ||results.cancelled!==0||results.skipped!==0||failed.length!==0||exitCode!==0)
  throw Error('Focused Trace regression suite failed or was incomplete: '
    +JSON.stringify({exitCode,...results,failed}));
const required=[
  'route manager reads only selected Frame',
  'four layers reuse shared index',
  'historical route queues read anchor_uids',
  'trace preserves multiple separate routes',
  'new four-character identities accept case-sensitive Base62',
  'single-UID migration has one atomic transaction',
  'read/write Queue probes only a missing-column schema error'
];
for(const title of required){
  if(!log.split('\n').some(line=>/^\s*ok \d+ - /.test(line)&&line.includes(title)))
    throw Error('Required Trace regression not executed: '+title);
}
console.log('All '+results.tests+' focused Trace tests passed, including Queue/UID compatibility.');
