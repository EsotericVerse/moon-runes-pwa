import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {publishPublicFiles} from './publish-public-files.mjs';
const makeRoot=()=>mkdtempSync(path.join(tmpdir(),'loc-public-publish-'));
test('publishing replaces all public files and removes stale Block pages',()=>{
  const root=makeRoot();
  try{
    const old=path.join(root,'app/modular/published-blocks/stale.js');
    mkdirSync(path.dirname(old),{recursive:true});writeFileSync(old,'stale');
    publishPublicFiles(root,[
      ['app/modular/published-site-bootstrap.js','export const data=1;'],
      ['app/modular/published-blocks/loc/index.js','export default [];']
    ]);
    assert.equal(existsSync(old),false);
    assert.equal(readFileSync(path.join(root,'app/modular/published-site-bootstrap.js'),'utf8'),'export const data=1;');
    assert.ok(existsSync(path.join(root,'app/modular/published-blocks/loc/index.js')));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('a failed installation restores prior Route/Config, Theme and Blocks',()=>{
  const root=makeRoot();
  try{
    const route=path.join(root,'app/modular/scope-route-index.js');
    const theme=path.join(root,'app/styles/published-themes.css');
    const blocks=path.join(root,'app/modular/published-blocks/loc/index.js');
    for(const [p,v] of [[route,'old-routes'],[theme,'old-theme'],[blocks,'old-blocks']]){
      mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,v);
    }
    const conflict=path.join(root,'app/conflict');
    writeFileSync(conflict,'not-a-directory');
    assert.throws(()=>publishPublicFiles(root,[
      ['app/modular/scope-route-index.js','new-routes'],
      ['app/styles/published-themes.css','new-theme'],
      ['app/conflict/bad.js','must-fail'],
      ['app/modular/published-blocks/loc/index.js','new-blocks']
    ]));
    assert.equal(readFileSync(route,'utf8'),'old-routes');
    assert.equal(readFileSync(theme,'utf8'),'old-theme');
    assert.equal(readFileSync(blocks,'utf8'),'old-blocks');
    assert.ok(existsSync(conflict));
  }finally{rmSync(root,{recursive:true,force:true});}
});
