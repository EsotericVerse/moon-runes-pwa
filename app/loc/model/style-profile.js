export const STYLE_STORAGE_KEY='loc-style-groups-v1';
export const MY_STYLE_STORAGE_KEY='loc-my-style-v1';
export const LIBRARY_RECORD_TYPE='library-item';
export const MAX_STYLE_GROUPS=8;
export const MAX_STYLE_KEYWORDS=64;
export const MAX_STYLE_NOR=8;
export const TEMPLATE_STYLE_GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序'];

export const makeStyleGroup=(index,name=`群組 ${index+1}`)=>({
  id:`group-${index+1}`,
  name,
  description:'',
  keywords:[],
  nor:[],
  is_fallback:false
});

export const INITIAL_STYLE_PROFILE={
  version:1,
  groups:TEMPLATE_STYLE_GROUPS.map((name,index)=>makeStyleGroup(index,name)),
  fallback:{id:'special',name:'特殊',description:'未命中其他群組的內容會進入這裡。',keywords:[],nor:[],is_fallback:true}
};

export const INITIAL_MY_STYLE={
  version:1,
  name:'我的風格',
  description:'由本機 Library 的分類結果統計形成。'
};

export const parseStyleTerms=(value,max)=>[...new Set(String(value||'').split(/[\n、,，・]/).map(x=>x.trim()).filter(Boolean))].slice(0,max);
export const styleTermsText=value=>(value||[]).join('\n');

export function normalizeStyleProfile(data){
  if(!data||typeof data!=='object')throw new Error('JSON 格式錯誤');
  const groups=(Array.isArray(data.groups)?data.groups:[]).slice(0,MAX_STYLE_GROUPS).map((group,index)=>({
    id:String(group.id||`group-${index+1}`),
    name:String(group.name||`群組 ${index+1}`),
    description:String(group.description||''),
    keywords:parseStyleTerms(Array.isArray(group.keywords)?group.keywords.join('\n'):group.keywords,MAX_STYLE_KEYWORDS),
    nor:parseStyleTerms(Array.isArray(group.nor)?group.nor.join('\n'):group.nor,MAX_STYLE_NOR),
    is_fallback:false
  }));
  return {
    version:1,
    groups,
    fallback:{
      id:'special',
      name:String(data.fallback?.name||'特殊'),
      description:String(data.fallback?.description||'未命中其他群組的內容會進入這裡。'),
      keywords:[],nor:[],is_fallback:true
    }
  };
}

export function createLibraryRecord({title='',text='',source='manual',classification=null,id}={}){
  const now=new Date().toISOString();
  const suffix=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id:id||`library:${suffix}`,
    type:LIBRARY_RECORD_TYPE,
    title:String(title||'未命名文字').trim()||'未命名文字',
    text:String(text||''),
    source:String(source||'manual'),
    classification,
    created_at:now,
    updated_at:now
  };
}
