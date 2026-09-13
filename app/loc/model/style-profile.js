export const STYLE_STORAGE_KEY='loc-style-groups-v1';
export const MY_STYLE_STORAGE_KEY='loc-my-style-v1';
export const LIBRARY_RECORD_TYPE='library-item';
export const MAX_STYLE_GROUPS=8;
export const MAX_STYLE_KEYWORDS=64;
export const MAX_STYLE_NOR=8;
export const TEMPLATE_STYLE_GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序'];

/* Group-name keyword specification
   1. group.name is itself a canonical visible keyword, e.g. 微月光.
   2. Matching rule: 長詞優先，短詞後判；已被長詞命中的文字區段，不得再重複加入短詞。
   3. A short name may still match elsewhere when that text range has not already been claimed by a longer name.
   4. Existing links and already-enhanced keyword nodes are excluded from enhancement.
   5. Keyword enhancement is bounded and non-recursive: scan content regions only, never the whole document.
   6. Exclude nav, anchors, buttons, form controls, code/pre, status/control UI, tables, Graph nodes, and game UI.
   7. Do not use MutationObserver for continuous rescanning and do not rescan on every React render.
   8. A text node is processed at most once; dynamic components must opt in explicitly if they need enhancement.
   9. The goal is one semantic match -> one visual emphasis -> one link, with no nested or duplicate links. */
export const sortGroupNamesLongestFirst=groups=>[...(groups||[])]
  .filter(group=>String(group?.name||'').trim())
  .sort((a,b)=>String(b.name).length-String(a.name).length||String(a.name).localeCompare(String(b.name),'zh-Hant'));

export const makeStyleGroup=(index,name=`群組 ${index+1}`)=>({
  id:`group-${index+1}`,
  name,
  description:'',
  keywords:[],
  nor:[],
  link:'',
  is_fallback:false
});

export const INITIAL_STYLE_PROFILE={
  version:1,
  groups:TEMPLATE_STYLE_GROUPS.map((name,index)=>makeStyleGroup(index,name)),
  fallback:{id:'special',name:'特殊',description:'未命中其他群組的內容會進入這裡。',keywords:[],nor:[],link:'',is_fallback:true}
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
    link:String(group.link||''),
    is_fallback:false
  }));
  return {
    version:1,
    groups,
    fallback:{
      id:'special',
      name:String(data.fallback?.name||'特殊'),
      description:String(data.fallback?.description||'未命中其他群組的內容會進入這裡。'),
      keywords:[],nor:[],link:String(data.fallback?.link||''),is_fallback:true
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
