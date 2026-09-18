'use client';

export function exportJson(data,filename='loc-data.json'){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

export async function readJsonFile(file){
  if(!file)throw new Error('未選擇檔案');
  return JSON.parse(await file.text());
}
