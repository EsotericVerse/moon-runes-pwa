import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runeImage} from '../app/lrunes/rune-directory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'assets/lunarunes/cards');
const expected=Array.from({length:66},(_,index)=>String(index+1).padStart(2,'0')+'.png').sort();
assert.deepEqual(fs.readdirSync(dir).sort(),expected,
  'Source Rune cards must be exactly 01.png–66.png without old Chinese-named aliases');
for(let id=1;id<=66;id++){
  const filename=String(id).padStart(2,'0')+'.png';
  const bytes=fs.readFileSync(path.join(dir,filename));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Bad PNG '+filename);
  for(const field of ['rune_id','id','rune_number']){
    assert.equal(runeImage({[field]:id,rune_name:'任意名稱',name:'不同資料名稱'}),
      '/assets/lunarunes/cards/'+filename,'Invalid image URL '+id+' '+field);
  }
}
assert.equal(runeImage({rune_id:0}),'','No published 00.png for author baseline');
assert.equal(runeImage({rune_id:67}),'','No nonexistent 67.png');
function scan(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){scan(file);continue;}
    if(!/\.(?:js|jsx|mjs|css)$/.test(entry.name))continue;
    const rel=path.relative(root,file).replaceAll('\\','/');
    if(rel==='app/lrunes/rune-directory.mjs')continue;
    assert.ok(!fs.readFileSync(file,'utf8').includes('/assets/lunarunes/cards/'),
      'Always use shared runeImage(), never hand-build image URLs in '+rel);
  }
}
scan(path.join(root,'app'));
for(const file of ['app/lrunes/game/GameBoard.jsx','app/lrunes/game/GameView.jsx','app/lrunes/RuneDrawClient.jsx']){
  assert.match(fs.readFileSync(path.join(root,file),'utf8'),/runeImage/,
    'Rune image consumer must use shared helper: '+file);
}
console.log('[rune-assets] 66 original numeric PNGs, shared runtime URLs, zero legacy card paths');
