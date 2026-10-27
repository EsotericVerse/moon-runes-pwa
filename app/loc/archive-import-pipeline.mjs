import {inspectPrivateArchive} from './private-archive-universal.mjs';
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {ARCHIVE_WRITE_WINDOW,createArchiveWriteWindow} from './archive-write-window.mjs';

export async function streamArchiveGalaxyRows(file,{onWindow,onProgress}={}){
  if(typeof onWindow!=='function')throw new Error('缺少 ZIP 分段寫入函式。');
  let records=0,windows=0;
  const buffer=createArchiveWriteWindow(async rows=>{
    const next=windows+1;
    await onWindow(rows,next);
    windows=next;
  },{size:ARCHIVE_WRITE_WINDOW});
  const summary=await inspectPrivateArchive(file,{
    onRecord:record=>{
      const article=archiveGalaxyRow(record);
      if(!article)return;
      records++;
      buffer.add({raw:article,import_uid:article.uid});
    },
    flush:()=>buffer.flush(),
    onProgress:p=>onProgress?.({...p,records,windows})
  });
  await buffer.flush(true);
  return {records,windows,summary};
}
