import {readFileSync} from 'node:fs';

// Verify actual TAP outcomes. Neither test titles nor implementation wording
// nor a hard-coded historic test count are a functional interface.
const path=process.argv[2];
if(!path)throw Error('Expected Node --test TAP log');
const log=readFileSync(path,'utf8');
const number=key=>{
  const matches=[...log.matchAll(new RegExp('^.*?# '+key+' (\\d+)\\s*$','gm'))];
  return matches.length?Number(matches.at(-1)[1]):NaN;
};
const tests=number('tests'),pass=number('pass'),fail=number('fail');
const cancelled=number('cancelled'),skipped=number('skipped');
const exitCode=process.argv[3]===undefined?null:Number(process.argv[3]);
if(!Number.isInteger(tests)||tests<1||pass+fail+cancelled+skipped!==tests
  ||fail!==0||cancelled!==0||skipped!==0
  ||(exitCode!==null&&exitCode!==0)){
  const failures=[...log.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map(m=>m[1].trim());
  throw Error('Focused Trace behavior tests did not pass: '
    +JSON.stringify({tests,pass,fail,cancelled,skipped,exitCode,failures}));
}
console.log('Focused Trace TAP passed: '+pass+'/'+tests+' (test wording ignored).');
