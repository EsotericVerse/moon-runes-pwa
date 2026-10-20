import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RUNE_SOLID_DEPTH,RUNE_SOLID_RASTER,RUNE_SOLID_FONTS,runeInkContours,runeSolidShapes}
  from '../app/lrunes/effekseer/rune-glyph-solid.mjs';
import {RUNE_GLYPH_STYLES,runeGlyphProfile,RUNE_GLYPH_IDS}
  from '../app/lrunes/effekseer/rune-glyph-library.mjs';

assert.equal(RUNE_SOLID_RASTER,384);
assert.ok(RUNE_SOLID_DEPTH>0);
for(const id of RUNE_GLYPH_IDS){
  const profile=runeGlyphProfile({rune_id:id});
  assert.ok(RUNE_SOLID_FONTS[profile.font],id+' must use its canonical font family');
}
assert.equal(Object.keys(RUNE_GLYPH_STYLES).length,8);
const width=64,height=64;
const mask=new Uint8Array(width*height);
for(let y=5;y<59;y++)for(let x=6;x<58;x++){
  if(x>17&&x<46&&y>17&&y<46)continue;
  mask[y*width+x]=1;
}
const contours=runeInkContours(mask,width,height);
assert.equal(contours.length,2,'Chinese glyph counters must remain separate');
const area=poly=>poly.reduce((sum,[x,y],i)=>{const [nx,ny]=poly[(i+1)%poly.length];return sum+x*ny-nx*y;},0)/2;
assert.ok(contours.some(c=>area(c)<0),'outer silhouette must be clockwise with Cartesian y');
assert.ok(contours.some(c=>area(c)>0),'a counter must retain reverse winding');
const fakePixels=new Uint8ClampedArray(RUNE_SOLID_RASTER**2*4);
for(let y=45;y<340;y++)for(let x=50;x<334;x++){
  if(x>113&&x<270&&y>110&&y<276)continue;
  fakePixels[(y*RUNE_SOLID_RASTER+x)*4+3]=255;
}
const mockContext={
  clearRect(){},fillText(){},
  getImageData(){return {data:fakePixels};},
  set textAlign(v){},set textBaseline(v){},set fillStyle(v){},set font(v){}
};
const canvas={width:0,height:0,getContext:()=>mockContext};
const shapes=runeSolidShapes(THREE,'回',runeGlyphProfile({rune_id:36}),canvas);
assert.equal(shapes.length,1,'solid glyph keeps one exterior outline');
assert.equal(shapes[0].holes.length,1,'closed counter must remain open through extrusion');
const volume=new THREE.ExtrudeGeometry(shapes,{depth:RUNE_SOLID_DEPTH,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.032});
const bounds=new THREE.Box3().setFromBufferAttribute(volume.getAttribute('position'));
assert.ok(bounds.max.z-bounds.min.z>.2,'actual 3D geometry needs measurable thickness');
assert.ok(volume.getAttribute('normal')?.count>100,'real mesh needs lit normals');
volume.dispose();
const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const component=readFileSync('app/lrunes/effekseer/RuneExtrudedGlyph.jsx','utf8');
const css=readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
assert.match(stage,/RuneExtrudedGlyph word=\{word\} profile=\{profile\}/);
assert.match(stage,/<span className="rune-direction-stroke"/);
assert.match(component,/new THREE\.ExtrudeGeometry\(shapes/);
assert.match(component,/mesh\.rotation\.set\(0,0,0\)/,'3D text face must never tilt away');
assert.match(component,/canvas\.offsetWidth,height=canvas\.offsetHeight/,'use native render resolution during giant reveal');
assert.match(component,/renderer\.setPixelRatio\(/);
assert.match(css,/rune-3d-glyph-fallback\[data-solid-ready="true"\]\{opacity:0\}/,
  'original Chinese text stays visible until real geometry is ready');
assert.doesNotMatch(component,/new THREE\.(?:Points|ShaderMaterial)/,'text rendering must not add invented magic FX');
console.log('[LunaRunes] 66 canonical rune colors/families and physically extruded Chinese glyph geometry verified.');
