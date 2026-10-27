// Keep a full backup import bounded in memory while retaining small database writes.
export const ARCHIVE_WRITE_WINDOW=30000;
export function createArchiveWriteWindow(onWindow,{size=ARCHIVE_WRITE_WINDOW}={}){
  if(typeof onWindow!=='function')throw new Error('缺少匯入分段寫入函式。');
  if(!Number.isInteger(size)||size<1)throw new Error('分段筆數必須是正整數。');
  const pending=[];
  return {
    add(record){pending.push(record);},
    async flush(final=false){
      while(pending.length>=size||(final&&pending.length)){
        const rows=pending.slice(0,size);
        await onWindow(rows);
        pending.splice(0,rows.length);
      }
    },
    get pendingCount(){return pending.length;}
  };
}
