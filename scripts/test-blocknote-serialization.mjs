import assert from 'node:assert/strict';
import {canonicalBlockNoteBlocks,canonicalBlockNoteHtml} from '../app/loc/blocknote-serialization.mjs';

const glyph='\uFFFC';
const blocks=[
  {id:'title',type:'paragraph',content:[{type:'text',text:'第一段',styles:{bold:true}}]},
  {id:'emptyA',type:'paragraph',content:[{type:'text',text:glyph,styles:{}}]},
  {id:'emptyB',type:'paragraph',content:[{type:'text',text:' ',styles:{}},{type:'text',text:glyph,styles:{}}]},
  {id:'text',type:'paragraph',content:[
    {type:'text',text:'文字',styles:{}},
    {type:'link',href:'https://example.com',content:[{type:'text',text:'連結',styles:{}}]}
  ]},
  {id:'inline-object',type:'paragraph',content:[
    {type:'text',text:'前',styles:{}},
    {type:'text',text:glyph,styles:{}},
    {type:'text',text:'後',styles:{}}
  ]},
  {id:'media',type:'image',props:{url:'https://example.com/image.png'},content:[]}
];
const canonical=canonicalBlockNoteBlocks(blocks);
assert.equal(canonical.length,blocks.length,'must not delete any paragraph');
assert.deepEqual(canonical[1].content,[],'replacement-only paragraph becomes a blank BlockNote block');
assert.deepEqual(canonical[2].content,[],'split whitespace + replacement glyph stays a blank block');
assert.strictEqual(canonical[0],blocks[0],'styled text unchanged');
assert.strictEqual(canonical[3],blocks[3],'inline links unchanged');
assert.strictEqual(canonical[4],blocks[4],'mixed text and inline objects unchanged');
assert.strictEqual(canonical[5],blocks[5],'media nodes unchanged');
assert.equal(blocks[1].content[0].text,glyph,'must not mutate original editor snapshot');
assert.strictEqual(canonicalBlockNoteBlocks(canonical),canonical,'normalization must be idempotent');
const parent=[{id:'a',type:'toggleListItem',content:[],children:[blocks[1]]}];
assert.deepEqual(canonicalBlockNoteBlocks(parent)[0].children[0].content,[],'nested empty paragraphs retained');
assert.strictEqual(canonicalBlockNoteBlocks([blocks[0]] )[0],blocks[0]);

const original='<p><strong>段一</strong></p><p>'+glyph+'</p><p>段二<br>軟換行</p><p>&#65532;</p><p>　</p><p><a href="https://example.com">連結</a></p>';
const expected='<p><strong>段一</strong></p><p><br></p><p>段二<br>軟換行</p><p><br></p><p><br></p><p><a href="https://example.com">連結</a></p>';
assert.equal(canonicalBlockNoteHtml(original),expected,'legacy export must preserve every blank line');
assert.equal(canonicalBlockNoteHtml(expected),expected,'HTML conversion must be idempotent');
assert.equal(canonicalBlockNoteHtml('<p>前'+glyph+'後</p>'),'<p>前'+glyph+'後</p>','actual inline object marker must remain');
assert.equal(canonicalBlockNoteHtml('<p><img src="https://example.com/asset.png"></p>'),'<p><img src="https://example.com/asset.png"></p>','media must remain');
assert.equal(canonicalBlockNoteHtml('<p class="editor-empty">'+glyph+'</p>'),'<p class="editor-empty"><br></p>','keep paragraph attributes');
assert.equal(canonicalBlockNoteHtml('<p>作者的話</p><p>ex-admin of StarRiver BBS</p>'),'<p>作者的話</p><p>ex-admin of StarRiver BBS</p>');

console.log('[blocknote-serialization] empty paragraph count, bold, links, media, nested blocks and HTML round-trip guards passed');
