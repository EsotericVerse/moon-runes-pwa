// A public Scope is a publishing destination, never a personal-chat archive.
// ZIP chat backups belong only to the device-local SQLite Scope.
export const PRIVATE_ARCHIVE_SOURCES=Object.freeze([
  'messenger','chatgpt','claude','gemini','msn','whatsapp','telegram',
  'discord','line','wechat','teams','copilot','grok','perplexity','meta ai','meta-ai'
]);
const privateSources=new Set(PRIVATE_ARCHIVE_SOURCES);
const publishablePlatforms=new Set(['facebook','threads','instagram','x']);
const publishableKinds=new Set(['post','media','story']);
const privatePath=/(?:^|\/)(?:messages?|inbox|archived_threads|message_requests|filtered_threads|direct[-_]?messages?|dm)(?:\/|$)|(?:^|\/)(?:conversations?|chat_history|messages?|direct[-_]?messages?(?:[-_]?group)?|dm[-_]?conversations?)(?:[-_]?part\d+)?\.(?:json|js|xml)$/i;
const privateFilename=/(?:^|[\\/_ .-])(?:messenger|chatgpt|openai|claude|anthropic|gemini|bard|copilot|grok|perplexity|msn|whatsapp|telegram|discord|wechat|teams|chat[_ -]?history|conversations?|messages?)(?:$|[\\/_ .-])/i;
const destinationError=()=>new Error('私人對話封存只能匯入個人手機的本地 SQLite；公開網站禁止接收 Messenger、AI 對話與其他聊天備份。');
export function isPrivateArchiveSource(source){
  return privateSources.has(String(source||'').trim().toLowerCase());
}
export function isPrivateArchiveRecord(record){
  const platform=String(record?.platform||'').toLowerCase().trim();
  const kind=String(record?.kind||'').toLowerCase().trim();
  return isPrivateArchiveSource(platform)||kind==='message'||kind==='conversation'||
    Boolean(record?.conversationId)||privatePath.test(String(record?.sourcePath||'').replace(/\\/g,'/'))||
    Boolean(record?.raw?.directMessage||record?.raw?.dmConversation||record?.raw?.messageCreate);
}
// Discovery is only a hint. In a mixed Meta ZIP, a private Messenger
// signature must not turn genuine Threads / Facebook posts into an error.
// Actual records are inspected individually before they can become articles.
export function assertPrivateArchiveDestination(nativeLocal,platforms=[]){
  if(nativeLocal)return;
  if(!platforms.some(name=>publishablePlatforms.has(String(name||'').toLowerCase()))){
    if(platforms.some(isPrivateArchiveSource))throw destinationError();
    throw new Error('無法證實這份 ZIP 含有可公開匯入的社群貼文；請在個人手機本地匯入。');
  }
}
export function isPrivateArchiveEntry(path){
  const normalized=String(path||'').replace(/\\/g,'/');
  return privatePath.test(normalized);
}
export function assertArchiveEntryDestination(path,nativeLocal=false){
  if(!nativeLocal&&isPrivateArchiveEntry(path))throw destinationError();
}
export function isPublicArchiveRecord(record){
  if(!record||isPrivateArchiveRecord(record))return false;
  const platform=String(record.platform||'').trim().toLowerCase();
  const kind=String(record.kind||'').trim().toLowerCase();
  return publishablePlatforms.has(platform)&&publishableKinds.has(kind);
}
export function assertArchiveRecordDestination(record,nativeLocal=false){
  if(nativeLocal)return;
  if(isPrivateArchiveRecord(record))throw destinationError();
  if(!isPublicArchiveRecord(record))
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
      privatePath.test(String(row.sourcePath||row.source_path||''))||
      // ChatGPT/Claude/Meta conversation JSON may be passed under a generic file name.
      (row.mapping&&typeof row.mapping==='object')||
      Array.isArray(row.chat_messages)||
      (Array.isArray(row.messages)&&(row.participants||row.conversation_id))||
      Array.isArray(row.conversations))
      throw destinationError();
  }
}
