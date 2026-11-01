import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('2D Rune dialogs share focus containment and scroll locking',()=>{
  const focus=read('app/lrunes/visual/useRuneDialogFocus.js');
  assert.match(focus,/document\.body\.style\.overflow='hidden'/);
  assert.match(focus,/event\.key==='Escape'/);
  assert.match(focus,/event\.key!=='Tab'/);
  assert.match(focus,/previousFocus\.isConnected/);
  for(const path of ['app/lrunes/duel2/RuneRitualLab.jsx','app/lrunes/daily3d/RuneDaily3D.jsx','app/lrunes/list2/RuneAtlasLab.jsx']){
    const source=read(path);
    assert.match(source,/useRuneDialogFocus/);
    assert.match(source,/ref=\{dialogRef\} tabIndex=\{-1\}/);
  }
  const atlas=read('app/lrunes/list2/RuneAtlasLab.jsx');
  assert.match(atlas,/return createPortal\(<div className="rune-art-modal-backdrop"/);
  assert.match(atlas,/<\/div>,document\.body\)/);
});

test('Rune overlays respect iPhone safe areas and touch target size',()=>{
  const css=read('app/lrunes/visual/rune-art-layout.css');
  assert.match(css,/env\(safe-area-inset-top,0px\)/);
  assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
  assert.match(css,/overscroll-behavior:contain/);
  assert.match(css,/@media\(pointer:coarse\)/);
});

test('Management sections attach only one browser history listener',()=>{
  const nav=read('app/modular/ManagementSectionNav.jsx');
  assert.match(nav,/resolveRef\.current=resolve/);
  assert.match(nav,/resolveRef\.current\(new URL/);
  assert.match(nav,/removeEventListener\('popstate',sync\);\s*},\[\]\);/);
});
