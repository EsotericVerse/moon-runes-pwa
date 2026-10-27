import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hero=read('app/loc/views/admin-panels/FeatureHeroImages.jsx');
const dock=read('app/modular/edit-dock.jsx');
const image=hero.split('function ImageSlot(')[1]?.split('function ManagementHeroDetails(')[0]||'';
const management=hero.split('function ManagementHeroDetails(')[1]?.split('export default function FeatureHeroImages(')[0]||'';

test('Hero image and management copy use only the Dock save in edit mode',()=>{
  for(const editor of [image,management]){
    assert.match(editor,/const inDock=Boolean\(dock\?\.active&&dock\.scopeId==='loc'\)/);
    assert.match(editor,/useEditDockForm\(\{save,isBusy:/);
    assert.match(editor,/\{!inDock\?<button/);
  }
  assert.match(hero,/使用功能列的「儲存」一次保存本頁變更/);
});
test('independent Admin access retains an inline save button',()=>{
  assert.match(image,/!inDock\?<button[^>]*onClick=\{save\}/);
  assert.match(management,/!inDock\?<button[^>]*onClick=\{save\}/);
});
test('each Hero writer prevents overlapping commits and re-reads the current UID',()=>{
  for(const editor of [image,management]){
    assert.match(editor,/const savingNow=useRef\(false\)/);
    assert.match(editor,/if\(savingNow\.current\|\|busy\|\|rows===null\)return false/);
    assert.match(editor,/const fresh=await selectLiveScopeBlocks\('loc',page\)/);
    assert.match(editor,/finally\{savingNow\.current=false;setBusy\(false\);\}/);
    assert.match(editor,/invalidateScopeBlockPage\('loc',page\)/);
  }
  assert.match(image,/const row=fresh\.find\(item=>Number\(item\.block_order\)===1\)/);
  assert.match(management,/const found=fresh\.find\(item=>Number\(item\.block_order\)===1\)/);
});
test('six-key Save and Save-and-switch cannot run concurrently',()=>{
  assert.match(dock,/const committing=useRef\(false\)/);
  assert.match(dock,/if\(busy\|\|committing\.current\)return/);
  assert.match(dock,/if\(busy\|\|committing\.current\|\|!switchTarget\)return/);
  assert.equal((dock.match(/committing\.current=true;setBusy\(true\)/g)||[]).length,2);
  assert.equal((dock.match(/committing\.current=false;setBusy\(false\)/g)||[]).length,2);
  assert.match(dock,/for\(const editor of editors\)\{/);
});
