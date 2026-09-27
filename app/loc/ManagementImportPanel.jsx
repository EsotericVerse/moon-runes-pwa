'use client';

import {useMemo,useState} from 'react';
import {insertNeonRows} from './neon-repository';
import {useNeonAccount} from './use-neon-account';
import {createUid8} from './uid';

function sourceSuggestion(name=''){
  const value=String(name).toLowerCase();
  for(const key of ['threads','facebook','pixnet','ptt','vocus','instagram']){
    if(value.includes(key))return key;
  }
  return String(name).replace(/\.json$/i,'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'import';
}
function firstValue(row,keys){
  for(const key of keys)if(row?.[key]!==undefined&&row?.[key]!==null&&String(row[key]).trim()!=='')return row[key];
  return '';
}
function asRows(value){
  if(Array.isArray(value))return value;
  if(Array.isArray(value?.items))return value.items;
  if(Array.isArray(value?.posts))return value.posts;
  if(Array.isArray(value?.data))return value.data;
  return value&&typeof value==='object'?[value]:[];
}
function iso(value){
  if(!value)return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}

function JsonImport({scopeId}){
  const account=useNeonAccount();
  const [fileName,setFileName]=useState('');
  const [rows,setRows]=useState([]);
  const [source,setSource]=useState('');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const suggested=useMemo(()=>sourceSuggestion(fileName),[fileName]);
  if(scopeId!=='lo3rwang')return <p>此 Current Scope 尚未啟用 Galaxy JSON 匯入。</p>;
  if(!account.canManageScopeSync(scopeId))return null;

  async function chooseFile(event){
    const file=event.target.files?.[0];if(!file)return;
    setFileName(file.name);setStatus('');
    try{
      const parsed=JSON.parse(await file.text());
      const list=asRows(parsed);
      setRows(list);setSource(current=>current||sourceSuggestion(file.name));
      setStatus(`已讀取 ${list.length.toLocaleString()} 筆；JSON 只作本次匯入載體，不作 Current 資料源。`);
    }catch(error){setRows([]);setStatus('JSON 解析失敗：'+(error?.message||error));}
  }
  async function run(){
    if(!rows.length)return;
    const selected=source.trim();
    if(!selected){setStatus('請先選擇來源。');return;}
    setBusy(true);setStatus('');
    try{
      const payload=rows.map(row=>({
        uid:String(firstValue(row,['uid'])||createUid8()).toUpperCase(),
        category:String(firstValue(row,['category'])||'other').trim()||'other',
        content_type:String(firstValue(row,['content_type','type'])||'other').trim()||'other',
        source_role:String(firstValue(row,['source_role'])||'').trim()||null,
        title:String(firstValue(row,['title','name','subject'])||'').trim()||null,
        content:String(firstValue(row,['content','body','text','message','description'])||'').trim()||null,
        createtime:iso(firstValue(row,['createtime','created_at','create_time','created_time','date','published_at'])),
        source_native_id:String(firstValue(row,['source_native_id','native_id'])||'').trim()||null,
        source_ref:String(firstValue(row,['source_ref'])||'').trim()||null,
        source_place:String(firstValue(row,['source_place','place'])||'').trim()||null,
        searchable:row?.searchable!==false&&row?.search!==false,
        meta_tags:String(firstValue(row,['meta_tags'])||'').trim()||null,
        source_id:String(firstValue(row,['source_id'])||'').trim()||null,
        target_id:String(firstValue(row,['target_id'])||'').trim()||null,
        ref_id:String(firstValue(row,['ref_id'])||'').trim()||null,
        url:String(firstValue(row,['url','link','permalink'])||'').trim()||null,
        source_name:selected,
        source_type:'content'
      })).filter(row=>row.title||row.content||row.url);
      await insertNeonRows('silver.lo3rwang_galaxy',payload);
      setStatus(`已匯入 ${payload.length.toLocaleString()} 筆到來源「${selected}」。`);
      setRows([]);setFileName('');
    }catch(error){setStatus(error?.message||'匯入失敗。');}
    finally{setBusy(false);}
  }
  return <div className="scope-v2-inline-card">
    <h4>JSON 匯入</h4>
    <label>本次檔案<input type="file" accept=".json,application/json" onChange={chooseFile}/></label>
    {fileName?<p>檔案：<strong>{fileName}</strong>｜建議來源：<strong>{suggested}</strong></p>:null}
    <label>來源選擇<input value={source} onChange={e=>setSource(e.target.value)} placeholder={suggested}/></label>
    <p className="loc-subtitle">建議位置只作提示；實際來源仍由管理者決定。source_id／target_id／ref_id 若存在會一併帶入。</p>
    {rows.length?<details><summary>預覽前 3 筆</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(rows.slice(0,3),null,2)}</pre></details>:null}
    <button type="button" disabled={busy||!rows.length} onClick={run}>{busy?'匯入中…':'開始匯入'}</button>
    {status?<p className="scope-v2-status">{status}</p>:null}
  </div>;
}

function SunoImport({scopeId}){
  const account=useNeonAccount();
  const [draft,setDraft]=useState({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  if(scopeId!=='lo3rwang')return null;
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  function detectId(url){
    const match=String(url||'').match(/\/song\/([0-9a-f-]{20,})/i);return match?.[1]||'';
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      if(!draft.title.trim())throw new Error('請填寫歌名。');
      const createtime=draft.createdDate?new Date(draft.createdDate+'T00:00:00+08:00').toISOString():new Date().toISOString();
      const lyricsUid=draft.lyrics.trim()?createUid8():null;
      const styleUid=lyricsUid&&draft.stylePrompt.trim()?createUid8():null;
      const sourceId=draft.source_id.trim()||(styleUid?draft.ref_id.trim():'')||null;
      if(lyricsUid){
        await insertNeonRows('silver.lo3rwang_galaxy',[{
          uid:lyricsUid,category:'music',content_type:'lyrics',source_role:'lyrics',
          title:draft.title.trim(),content:draft.lyrics.trim(),createtime,
          source_id:sourceId,target_id:draft.target_id.trim()||null,ref_id:styleUid||draft.ref_id.trim()||null,
          url:draft.url.trim()||null,searchable:true,source_name:'suno',source_type:'content'
        }]);
      }
      if(styleUid){
        await insertNeonRows('silver.lo3rwang_galaxy',[{
          uid:styleUid,category:'music',content_type:'instruction',source_role:'style_prompt',
          title:draft.title.trim()+'｜Suno Style',content:draft.stylePrompt.trim(),createtime,
          target_id:lyricsUid,searchable:true,source_name:'suno',source_type:'content'
        }]);
      }
      await insertNeonRows('silver.lo3rwang_galaxy_media',[{
        galaxy_link:lyricsUid,
        source_native_id:draft.nativeId.trim()||detectId(draft.url)||null,media_type:'suno',
        title:draft.title.trim(),url:draft.url.trim()||null,
        meta_tags:draft.metaTags.trim()||null,createtime
      }]);
      setStatus('Suno 單筆資料已儲存。');setDraft({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
    }catch(error){setStatus(error?.message||'Suno 儲存失敗。');}
    finally{setBusy(false);}
  }
  return <div className="scope-v2-inline-card">
    <h4>Suno 單筆匯入</h4>
    <p>Suno 無批次匯出時使用。歌詞與 Suno Style 進 Galaxy；媒體連結與 Meta Tag 進 Galaxy Media。</p>
    <form onSubmit={save} className="scope-v2-editor">
      <label>歌名<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>歌詞<textarea rows={8} value={draft.lyrics} onChange={e=>change('lyrics',e.target.value)}/></label>
      <div className="scope-v2-stat-controls">
        <label>Suno URL<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label>Suno ID<input value={draft.nativeId} onChange={e=>change('nativeId',e.target.value)} placeholder="可由 URL 自動辨識"/></label>
        <label>日期<input type="date" value={draft.createdDate} onChange={e=>change('createdDate',e.target.value)}/></label>
      </div>
      <div className="scope-v2-stat-controls">
        <label>Suno Style<input value={draft.stylePrompt} onChange={e=>change('stylePrompt',e.target.value)}/></label>
        <label>Meta Tags<input value={draft.metaTags} onChange={e=>change('metaTags',e.target.value)}/></label>
      </div>
      <div className="scope-v2-stat-controls">
        <label>source_id<input value={draft.source_id} onChange={e=>change('source_id',e.target.value)}/></label>
        <label>target_id<input value={draft.target_id} onChange={e=>change('target_id',e.target.value)}/></label>
        <label>ref_id<input value={draft.ref_id} onChange={e=>change('ref_id',e.target.value)}/></label>
      </div>
      <button type="submit" disabled={busy}>{busy?'儲存中…':'儲存 Suno 資料'}</button>
      {status?<p className="scope-v2-status">{status}</p>:null}
    </form>
  </div>;
}

export default function ManagementImportPanel({scopeId}){
  return <section className="scope-v2-inline-card">
    <h3>匯入</h3>
    <JsonImport scopeId={scopeId}/>
    <SunoImport scopeId={scopeId}/>
  </section>;
}
