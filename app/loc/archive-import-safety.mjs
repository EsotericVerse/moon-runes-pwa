// A public Scope is a publishing destination, never a personal-chat archive.
// ZIP chat backups belong only to the device-local SQLite Scope.
export const PRIVATE_ARCHIVE_SOURCES=Object.freeze([
  'messenger','chatgpt','claude','gemini','msn','whatsapp','telegram',
  'discord','line','wechat','teams','copilot','grok','perplexity','meta ai','meta-ai'
]);
const privateSources=new Set(PRIVATE_ARCHIVE_SOURCES);
const publishablePlatforms=new Set(['facebook','threads','instagram','x']);
const publishableKinds=new Set(['post','media','story']);
const privatePath=/(?:^|\/)(?:messages?|inbox|archived_threads|message_requests|filtered_threads|direct_messages?|dm)(?:\/|$)|(?:^|\/)(?:conversations?|chat_history|messages?)(?:[_\d-]*\.json|\.xml)$/i;
const privateFilename=/(?:^|[\\/_ .-])(?:messenger|chatgpt|openai|claude|anthropic|gemini|bard|copilot|grok|perplexity|msn|whatsapp|telegram|discord|wechat|teams|chat[_ -]?history|conversations?|messages?)(?:$|[\\/_ .-])/i;
const destinationError=()=>new Error('私人對話封存只能匯入個人手機的本地 SQLite；公開網站禁止接收 Messenger、AI 對話與其他聊天備份。');
export function isPrivateArchiveSource(source){
  return privateSources.has(String(source||'').trim().toLowerCase());
}
export function isPrivateArchiveRecord(record){
  const platform=String(record?.platform||'').toLowerCase().trim();
  const kind=String(record?.kind||'').toLowerCase().trim();
  return isPrivateArchiveSource(platform)||kind==='message'||kind==='conversation'||
    Boolean(record?.conversationId)||privatePath.test(String(record?.sourcePath||'').replace(/\\/g,'/'));
}
export function assertPrivateArchiveDestination(nativeLocal,platforms=[]){
  if(nativeLocal)return;
  if(platforms.some(isPrivateArchiveSource))throw destinationError();
}
export function assertArchiveRecordDestination(record,nativeLocal=false){
  if(nativeLocal)return;
  if(isPrivateArchiveRecord(record))throw destinationError();
  // Unknown ZIP schema is not accepted as a public article. Explicit public
  // social-post/media formats can continue to use the existing import flow.
  const platform=String(record?.platform||'').trim().toLowerCase();
  const kind=String(record?.kind||'').trim().toLowerCase();
  if(!publishablePlatforms.has(platform)||!publishableKinds.has(kind))
    throw new Error('公開網站只接受可辨識的社群貼文／媒體 ZIP；未知格式請在個人手機本地匯入，不能當作公開文章。');
}
export function assertStandaloneImportDestination({nativeLocal=false,fileName='',rows=[],source=''}={}){
  if(nativeLocal)return;
  const name=String(fileName||'').toLowerCase().replace(/\\/g,'/');
  if(privateFilename.test(name)||isPrivateArchiveSource(source))throw destinationError();
  for(const input of rows){
    const row=input?.raw||input||{};
    if(isPrivateArchiveSource(row.source_name)||isPrivateArchiveSource(row.platform)||
      ['message','conversation'].includes(String(row.kind||'').toLowerCase())||
      privatePath.test(String(row.sourcePath||row.source_path||'')))
      throw destinationError();
  }
}
