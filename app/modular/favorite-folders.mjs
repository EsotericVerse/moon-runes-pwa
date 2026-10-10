// Favorite folders are a presentation layer, not Scope Groups or permissions.
// Stored in one api.user_settings.text_value field as encoded tab-separated rows.
export const FOLDERS_SETTING_KEY='loc-favorite-folders-v1';
export const MAX_FOLDERS=30;
const ID=/^[a-z][a-z0-9]{3,35}$/;
const SCOPE=/^[a-z][a-z0-9]{0,14}$/;
export function cleanFolderName(value){return String(value||'').trim().replace(/[\r\n\t]+/g,' ').slice(0,35);}
export function normalizeFavoriteFolders(rows=[]){
  const seenFolders=new Set(),assigned=new Set(),out=[];
  for(const raw of Array.isArray(rows)?rows:[]){
    const id=String(raw?.id||'').trim().toLowerCase();
    const label=cleanFolderName(raw?.label);
    if(!ID.test(id)||!label||seenFolders.has(id))continue;
    const scopes=[];
    for(const item of Array.isArray(raw?.scopes)?raw.scopes:[]){
      const sid=String(item||'').trim().toLowerCase();
      if(!SCOPE.test(sid)||sid==='admin'||sid==='loc'||assigned.has(sid))continue;
      assigned.add(sid);scopes.push(sid);
    }
    seenFolders.add(id);out.push({id,label,scopes});
    if(out.length>=MAX_FOLDERS)break;
  }
  return out;
}
export function serializeFavoriteFolders(rows=[]){
  return normalizeFavoriteFolders(rows).map(({id,label,scopes})=>
    id+'\t'+encodeURIComponent(label)+'\t'+scopes.join(',')
  ).join('\n');
}
export function parseFavoriteFolders(raw){
  if(!raw)return [];
  const entries=String(raw).split('\n').slice(0,MAX_FOLDERS*2).map(line=>{
    const [id,encoded='',scopes='']=line.split('\t');
    let label='';
    try{label=decodeURIComponent(encoded);}catch{return null;}
    return {id,label,scopes:scopes.split(',').filter(Boolean)};
  }).filter(Boolean);
  return normalizeFavoriteFolders(entries);
}
export function visibleFavoriteLayout(favorites=[],folders=[]){
  const ids=[...new Set(favorites)].filter(id=>id!=='loc'&&id!=='admin');
  const available=new Set(ids);
  const owned=new Set();
  const directories=normalizeFavoriteFolders(folders).map(folder=>{
    const scopes=folder.scopes.filter(id=>available.has(id)&&!owned.has(id));
    scopes.forEach(id=>owned.add(id));
    return {...folder,scopes};
  });
  return {direct:ids.filter(id=>!owned.has(id)),directories};
}
