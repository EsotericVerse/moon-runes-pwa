import {createHash} from 'node:crypto';
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {RUNE_SEMANTIC_ICONS,SEMANTIC_ICON_REVISION} from '../app/lrunes/effekseer/rune-semantic-icons.mjs';

// Game-Icons.net: pre-authored, meaning-specific icons, not generated VFX.
// CC BY 3.0 attribution and original author paths are retained in NOTICE.txt.
const ROOT=resolve('public/vendor/rune-semantic-icons');
function valid(bytes,item){
 return bytes.length===item.size&&createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===item.sha;
}
async function install(item){
 const target=resolve(ROOT,item.id+'.svg');
 try{if(valid(await readFile(target),item))return false;}catch(e){if(e.code!=='ENOENT')throw e;}
 const url='https://raw.githubusercontent.com/game-icons/icons/'+SEMANTIC_ICON_REVISION+'/'+item.path;
 let failure;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw Error('HTTP '+r.status+' '+item.path);
   const bytes=Buffer.from(await r.arrayBuffer());
   if(!valid(bytes,item))throw Error('Icon blob checksum mismatch '+item.path);
   await mkdir(ROOT,{recursive:true});
   const tmp=target+'.part-'+process.pid;
   try{await writeFile(tmp,bytes);await rename(tmp,target);}finally{await rm(tmp,{force:true});}
   return true;
  }catch(e){failure=e;if(String(e.message).includes('checksum'))break;}
 }
 throw Error('Cannot install semantic icon '+item.path+': '+String(failure?.message||failure));
}
async function prepare(){
 if(RUNE_SEMANTIC_ICONS.length!==67)throw Error('Missing Rune semantic icons');
 const ids=new Set(RUNE_SEMANTIC_ICONS.map(x=>x.id));
 if(ids.size!==67)throw Error('Rune semantic icon collision');
 let at=0,added=0;
 await Promise.all(Array.from({length:8},async()=>{while(at<RUNE_SEMANTIC_ICONS.length){if(await install(RUNE_SEMANTIC_ICONS[at++]))added++;}}));
 console.log('Authored semantic icon library: 67 verified; '+added+' installed.');
}
await prepare();
