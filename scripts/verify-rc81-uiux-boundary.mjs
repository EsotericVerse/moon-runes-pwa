import {execFileSync} from 'node:child_process';

const base=process.env.RC81_BASE||'origin/main';
const allowed=[
  /^app\/styles\/rc81-uiux\.css$/,
  /^app\/globals\.css$/,
  /^app\/layout\.jsx$/,
  /^app\/Rc81Experience\.jsx$/,
  /^tests\//,
  /^playwright\.config\.mjs$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^\.github\/workflows\/rc81-uiux-quality\.yml$/,
  /^scripts\/verify-rc81-uiux-boundary\.mjs$/
];

let output='';
try{
  output=execFileSync('git',['diff','--name-only',`${base}...HEAD`],{encoding:'utf8'}).trim();
}catch(error){
  console.error('[rc81-boundary] unable to compare against '+base);
  console.error(error?.message||error);
  process.exit(1);
}

const changed=output?output.split(/\r?\n/).filter(Boolean):[];
const unexpected=changed.filter(path=>!allowed.some(rule=>rule.test(path)));

if(unexpected.length){
  console.error('[rc81-boundary] out-of-scope files changed:');
  for(const path of unexpected)console.error('- '+path);
  process.exit(1);
}

console.log('[rc81-boundary] OK: presentation-only change boundary preserved.');
for(const path of changed)console.log('- '+path);
