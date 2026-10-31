import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const hook=fileURLToPath(new URL('./check-bulk-delete.mjs',import.meta.url));

function git(dir,...args){
  const result=spawnSync('git',args,{cwd:dir,encoding:'utf8'});
  assert.equal(result.status,0,`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
function fixture(count=3){
  const dir=mkdtempSync(join(tmpdir(),'loc-push-guard-'));
  git(dir,'init','-q','--initial-branch=main');
  git(dir,'config','user.name','LOC Test');
  git(dir,'config','user.email','test@loc.invalid');
  for(let i=0;i<count;i++)writeFileSync(join(dir,`example-${i}.txt`),'original');
  git(dir,'add','.');
  git(dir,'commit','-qm','Base commit');
  return {dir,base:git(dir,'rev-parse','HEAD')};
}
function commitDeletion(dir,count,message='Remove files'){
  for(let i=0;i<count;i++)rmSync(join(dir,`example-${i}.txt`));
  git(dir,'add','-A');git(dir,'commit','-qm',message);
  return git(dir,'rev-parse','HEAD');
}
function inspectPush(dir,tip,remote){
  const input=`refs/heads/main ${tip} refs/heads/main ${remote}\n`;
  return spawnSync(process.execPath,[hook],{cwd:dir,input,encoding:'utf8'});
}

test('missing remote object fails closed with actionable GitHub Desktop steps',()=>{
  const {dir,base}=fixture();
  try{
    const result=inspectPush(dir,base,'b'.repeat(40));
    assert.equal(result.status,1);
    assert.match(result.stderr,/Fetch origin.*Pull origin.*Push origin/s);
    assert.doesNotMatch(result.stderr,/Invalid revision range|node:internal/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('a small deletion is allowed when the remote commit is locally known',()=>{
  const {dir,base}=fixture();
  try{
    const tip=commitDeletion(dir,1);
    const result=inspectPush(dir,tip,base);
    assert.equal(result.status,0,result.stderr);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('more than 20 file deletions remain blocked',()=>{
  const {dir,base}=fixture(23);
  try{
    const tip=commitDeletion(dir,21);
    const result=inspectPush(dir,tip,base);
    assert.equal(result.status,1);
    assert.match(result.stderr,/nets 21 D\/R files/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('explicit confirmed bulk-delete override still works',()=>{
  const {dir,base}=fixture(23);
  try{
    const tip=commitDeletion(dir,21,'Remove files [bulk-delete-ok]');
    const result=inspectPush(dir,tip,base);
    assert.equal(result.status,0,result.stderr);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
