import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBlockImage,heroImageUrl,savedFrameImage} from '../app/loc/hero-image.mjs';
import {firstFrameImageUrl} from '../app/loc/blocknote-content.mjs';
import {createIndependentClerkIdentity} from '../app/loc/auth/clerk-identity.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('legacy LunaRunes raw /pics image remains visible with no DB changes',()=>{
  const old='/pics/LunaRunes-hero.jpg';
  assert.deepEqual(parseBlockImage(old),{source:'custom',url:old});
  assert.equal(heroImageUrl({block_image:old}),old);
  assert.equal(parseBlockImage('javascript:alert(1)'),null);
});

test('embedded author image is reflected in saved frame URL',()=>{
  const image='<p>文字</p><img src="https://loc.lo3rwang.cc/pics/myselfs.jpg">';
  const url=firstFrameImageUrl({text:image});
  assert.equal(url,'https://loc.lo3rwang.cc/pics/myselfs.jpg');
  assert.deepEqual(savedFrameImage({width:400,position:'right'},url),{
    width:400,position:'right',url,source:'custom'
  });
});

test('intentional image hide and preset selection are unchanged',()=>{
  const embedded='https://loc.lo3rwang.cc/pics/myselfs.jpg';
  assert.deepEqual(savedFrameImage({source:'none',url:''},embedded),{source:'none',url:''});
  assert.deepEqual(savedFrameImage({source:'default',url:''},embedded),{source:'default',url:''});
  assert.deepEqual(savedFrameImage({source:'custom',url:''},embedded),{source:'custom',url:embedded});
});

test('editor input and save use the same legacy-image fallback',()=>{
  assert.match(read('app/loc/HeroImageFields.jsx'),/draft.image\?\.url\|\|image.customUrl/);
  assert.match(read('app/loc/ScopeBlockEditorSession.jsx'),/savedFrameImage\(draft.image,BlockNoteContent.image.firstFrameImageUrl\(draft\)\)/);
  assert.match(read('app/loc/LocHomeBlockDisplay.jsx'),/config\?\.url\|\|embedded/);
});

test('published feature Hero image URLs were reconciled with stored blocks',()=>{
  const expected={
    scope_culture:'scope-culture.jpg',scope_statics:'scope-statics.jpg',
    scope_trace:'scope-gn.jpg',scope_search:'scope-search.jpg',
    scope_admin:'LOC-admin.jpg',scope_manage:'scope-gn.jpg',
    scope_setting:'local-setting.jpg',group_culture:'LOC-culture.jpg',
    group_statics:'LOC-statics.jpg',group_search:'LOC-search.jpg',
    group_admin:'LOC-admin.jpg',group_setting:'local-setting.jpg'
  };
  for(const [page,file] of Object.entries(expected)){
    const src=read('app/modular/published-blocks/loc/'+page+'.js');
    const body=src.slice(src.indexOf('export default ')+15).replace(/;\s*$/,'');
    const records=JSON.parse(body);
    assert.equal(heroImageUrl(records.find(row=>row.block_order===1)), 'https://loc.lo3rwang.cc/pics/'+file,page);
  }
});

test('same Clerk JWT coalesces simultaneous identity verification without caching grants',async()=>{
  let network=0;
  const clerk={user:{id:'user_TEST'},session:{getToken:async()=>'synthetic.jwt.token'}};
  const identity=createIndependentClerkIdentity({
    authorityOrigin:'https://control.example.org',
    siteOrigin:'https://loc.example.org',
    loadClerk:async()=>clerk,
    fetchImpl:async()=>{network++;await new Promise(resolve=>setTimeout(resolve,1));return{
      ok:true,json:async()=>({provider:'clerk',subject:'user_TEST',session:'sess_TEST',email:'owner@example.org'})
    };}
  });
  const all=await Promise.all(Array.from({length:6},()=>identity.verifiedIdentity()));
  assert.equal(network,1);
  assert.equal(all.every(result=>result.subject==='user_TEST'),true);
  await identity.verifiedIdentity();
  assert.equal(network,2,'after promise completes, a later verification must be fresh');
});
