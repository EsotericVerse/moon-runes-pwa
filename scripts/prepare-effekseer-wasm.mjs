import {createHash} from 'node:crypto';
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// The exact upstream WebGL runtime matching public/vendor/effekseer/effekseer.js.
// This script vendors only official binary assets at build/dev time, never VFX.
const REVISION='e8c3ce076644789918695b0cba0031461c817890';
const SOURCE='https://raw.githubusercontent.com/effekseer/EffekseerForWebGL/'+REVISION+'/docs/effekseer.wasm';
const EXPECTED_BYTES=1201973;
const GIT_BLOB_SHA='c4c0e39ad688caec1401f2c408f88b3a387ea9a1';
const TARGET=resolve('public/vendor/effekseer/effekseer.wasm');

function valid(bytes){
  if(bytes.length!==EXPECTED_BYTES)return false;
  return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===GIT_BLOB_SHA;
}
async function prepare(){
  try{
    const existing=await readFile(TARGET);
    if(valid(existing)){
      console.log('Effekseer WebAssembly verified locally ('+existing.length+' bytes).');
      return;
    }
  }catch(error){
    if(error.code!=='ENOENT')throw error;
  }
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(SOURCE,{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw Error('Official Effekseer runtime HTTP '+response.status);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(!valid(bytes))throw Error('Official Effekseer runtime failed pinned Git blob verification');
      await mkdir(resolve('public/vendor/effekseer'),{recursive:true});
      const temporary=TARGET+'.tmp-'+process.pid;
      try{
        await writeFile(temporary,bytes);
        await rename(temporary,TARGET);
      }finally{
        await rm(temporary,{force:true});
      }
      console.log('Official Effekseer WebAssembly installed locally ('+bytes.length+' bytes).');
      return;
    }catch(error){
      lastError=error;
      if(String(error.message).includes('verification'))break;
    }
  }
  throw Error('Unable to bundle pinned Effekseer runtime: '+String(lastError?.message||lastError));
}
await prepare();
