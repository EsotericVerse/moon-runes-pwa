import {readFileSync} from 'node:fs';

// CI boundary for this independent Trace change. These exact two Culture/ISR
// assertions already fail on untouched main because ISR is intentionally off.
// Every other bootstrap test must pass; otherwise this check fails closed.
const file=process.argv[2];
if(!file)throw Error('Expected a Node --test TAP log file');
const log=readFileSync(file,'utf8');
const failed=[...log.matchAll(/^.*?not ok \d+ - (.+)$/gm)].map(x=>x[1].trim());
const count=kind=>[...log.matchAll(new RegExp('^.*?# '+kind+' (\\d+)\\s*$','gm'))]
  .map(x=>Number(x[1])).at(-1);
const tests=count('tests'),passed=count('pass'),failures=count('fail');
const expected=[
 'Culture and Statistics use a shared ISR Period index as primary navigation',
 'Culture classification is a published JS module, not a mandatory four-query startup'
];
if(!Number.isInteger(tests)||!Number.isInteger(passed)||!Number.isInteger(failures)
  ||tests<150||passed+failures!==tests||failed.length!==failures)
  throw Error('Bootstrap test summary missing, truncated or inconsistent');
const unexpected=failed.filter(x=>!expected.includes(x));
if(unexpected.length||failures>expected.length||new Set(failed).size!==failed.length)
  throw Error('New bootstrap failures beyond untouched main: '+JSON.stringify(unexpected.length?unexpected:failed));
if(failures){
  if(failures!==expected.length||expected.some(x=>!failed.includes(x)))
    throw Error('Bootstrap failures changed from the verified main baseline: '+JSON.stringify(failed));
  console.log('BASELINE KNOWN-FAIL: '+failures+' unchanged Culture/ISR tests; '
    +passed+'/'+tests+' remaining bootstrap tests passed.');
  console.log('The two failing assertions are tracked as other-line baseline defects; '
    +'this checker does not claim that the full bootstrap suite passed.');
}else{
  console.log('All '+tests+' bootstrap tests passed. No known-baseline exceptions required.');
}
