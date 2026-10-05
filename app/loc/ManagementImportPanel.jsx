'use client';

import {UI_COPY} from '../i18n/ui-copy';

import {useMemo,useState} from 'react';
import {insertRows,dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {normalizeGalaxyContent,normalizeRelationIds,resolveGalaxyTitle} from './content-policy';

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

function normalizeJsonImportEntry(entry,source){
  const row=entry?.raw||entry||{};
  const content=normalizeGalaxyContent(firstValue(row,['content','body','text','message','description']));
  const uid=String(entry?.import_uid||firstValue(row,['uid'])||createUid8()).trim().toUpperCase();
  if(!content)return {record:null,error:'無正文'};
  if(uid.length!==8)return {record:null,error:'UID 必須為 8 字'};
  const record={
    uid,
    content_type:String(firstValue(row,['content_type','type'])||'other').trim()||'other',
    title:resolveGalaxyTitle(firstValue(row,['title','name','subject']),content),
    content,
    createtime:iso(firstValue(row,['createtime','created_at','create_time','created_time','date','published_at'])),
    source_native_id:String(firstValue(row,['source_native_id','native_id'])||'').trim()||null,
    source_place:String(firstValue(row,['source_place','place'])||'').trim()||null,
    searchable:row?.searchable!==false&&row?.search!==false,
    source_id:String(firstValue(row,['source_id'])||'').trim()||null,
    target_id:normalizeRelationIds(firstValue(row,['target_id'])),
    ref_id:String(firstValue(row,['ref_id'])||'').trim()||null,
    url:String(firstValue(row,['url','link','permalink'])||'').trim()||null,
    source_name:String(source||'').trim()
  };
  return {record,error:''};
}

function JsonImport({scopeId}){
  const account=useAccount();
  const [fileName,setFileName]=useState('');
  const [rows,setRows]=useState([]);
  const [source,setSource]=useState('');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const suggested=useMemo(()=>sourceSuggestion(fileName),[fileName]);
  const analyzed=useMemo(()=>{
    const selected=source.trim();
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      invalid:normalized.filter(item=>!item.record)
    };
  },[rows,source]);
  if(!account.canManageScopeSync(scopeId))return null;

  async function chooseFile(event){
    const file=event.target.files?.[0];
    if(!file)return;
    setFileName(file.name);setStatus('');
    try{
      const parsed=JSON.parse(await file.text());
      const list=asRows(parsed);
      const prepared=list.map(row=>({
        raw:row,
        import_uid:String(firstValue(row,['uid'])||createUid8()).trim().toUpperCase()
      }));
      setRows(prepared);
      setSource(sourceSuggestion(file.name));
      setStatus(`已解析 ${list.length.toLocaleString()} 筆；請先確認預覽，再執行匯入。`);
    }catch(error){
      setRows([]);
      setStatus('JSON 解析失敗：'+(error?.message||error));
    }
  }

  async function run(){
    if(!rows.length)return;
    const selected=source.trim();
    if(!selected){setStatus('請先選擇來源。');return;}
    if(!analyzed.valid.length){setStatus('沒有可匯入的有效資料。');return;}
    setBusy(true);setStatus('');
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');
      const unique=[];
      const seen=new Set();
      let duplicateCount=0;
      for(const record of analyzed.valid){
        if(seen.has(record.uid)){duplicateCount+=1;continue;}
        seen.add(record.uid);unique.push(record);
      }

      const existing=new Set();
      for(let offset=0;offset<unique.length;offset+=200){
        const ids=unique.slice(offset,offset+200).map(record=>record.uid);
        const {data,error}=await dbAuthRelation(galaxy).select('uid').in('uid',ids);
        if(error)throw new Error(error.message||'既有 UID 檢查失敗。');
        for(const row of data||[])existing.add(String(row.uid||'').toUpperCase());
      }
      const payload=unique.filter(record=>!existing.has(record.uid));
      await insertRows(galaxy,payload);
      const skipped=analyzed.invalid.length+duplicateCount+existing.size;
      setStatus(`已匯入 ${payload.length.toLocaleString()} 筆到來源「${selected}」${skipped?`；略過 ${skipped.toLocaleString()} 筆無效／重複／已存在資料。`:''}`);
      setRows([]);setFileName('');
    }catch(error){
      setStatus(error?.message||'匯入失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.importJson}</h4>
    <label>{UI_COPY.management.currentFile}<input type="file" accept=".json,application/json" onChange={chooseFile}/></label>
    {fileName?<p>檔案：<strong>{fileName}</strong>｜建議來源：<strong>{suggested}</strong></p>:null}
    <label>{UI_COPY.management.sourceChoice}<input value={source} onChange={event=>setSource(event.target.value)} placeholder={suggested}/></label>
    <p className="loc-subtitle">JSON 只作本次匯入載體。會解析正文、標題、時間、URL、來源 ID、關聯欄位與搜尋狀態，再寫入此 Scope 的 Galaxy。</p>

    {rows.length?<section className="scope-import-preview" aria-label="JSON 匯入預覽">
      <p className="scope-status">有效 {analyzed.valid.length.toLocaleString()} 筆｜略過 {analyzed.invalid.length.toLocaleString()} 筆</p>
      <div className="scope-management-records">
        {analyzed.valid.slice(0,5).map(record=><article className="scope-inline-card" key={record.uid}>
          <strong>{record.title||record.uid}</strong>
          <span>{record.uid} · {record.content_type} · {String(record.createtime||'').slice(0,10)||'無日期'}</span>
          <p>{String(record.content||'').slice(0,180)}{String(record.content||'').length>180?'…':''}</p>
        </article>)}
      </div>
      {analyzed.invalid.length?<p className="scope-status">前幾筆略過原因：{analyzed.invalid.slice(0,5).map(item=>item.error).join('、')}</p>:null}
    </section>:null}

    <button type="button" disabled={busy||!analyzed.valid.length} onClick={run}>{busy?UI_COPY.management.importing:UI_COPY.management.startImport}</button>
    {status?<p className="scope-status">{status}</p>:null}
  </div>;
}

function MediaRecordInsert({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState({
    galaxy_link:'',
    source_native_id:'',
    source_place:'',
    media_type:'',
    title:'',
    url:'',
    meta_tags:'',
    createtime:''
  });
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setBusy(true);setStatus('');
    try{
      const galaxyLink=String(draft.galaxy_link||'').trim().toUpperCase();
      if(galaxyLink&&galaxyLink.length!==8)throw new Error('galaxy_link 必須是 8 字 UID，或留空。');
      const mediaType=String(draft.media_type||'').trim();
      if(!mediaType)throw new Error('media_type 為必填欄位。');
      const metaTags=String(draft.meta_tags||'').trim();
      if(!metaTags)throw new Error('meta_tags 必須在建立多媒體紀錄時由資料提供者設定；LOC 不會自動分類。');
      const record={
        galaxy_link:galaxyLink||null,
        source_native_id:String(draft.source_native_id||'').trim()||null,
        source_place:String(draft.source_place||'').trim()||null,
        media_type:mediaType,
        title:String(draft.title||'').trim()||null,
        url:String(draft.url||'').trim()||null,
        meta_tags:metaTags,
        createtime:iso(draft.createtime)
      };
      const galaxyMedia=account.scopeDataFor(scopeId)?.galaxyMedia;
      if(!galaxyMedia)throw new Error('Scope data 未解析');
      await insertRows(galaxyMedia,[record]);
      setStatus('多媒體資料已直接寫入 Galaxy Media。');
      setDraft({
        galaxy_link:'',
        source_native_id:'',
        source_place:'',
        media_type:'',
        title:'',
        url:'',
        meta_tags:'',
        createtime:''
      });
    }catch(error){setStatus(error?.message||'多媒體儲存失敗。');}
    finally{setBusy(false);}
  }

  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.addMedia}</h4>
    <p>只記錄外部媒體參照與文字 metadata：URL／雲端連結、檔名或標題、來源 ID、時間、地點與 Meta Tag；不接收、不暫存任何圖片／音訊／影片檔案。media_id 由資料庫自動產生，url 可留空。</p>
    <form onSubmit={save} className="scope-editor">
      <div className="scope-stat-controls">
        <label>media_type<input value={draft.media_type} onChange={e=>change('media_type',e.target.value)} placeholder="ig_pic / facebook_pic / suno / video / url" required/></label>
        <label>galaxy_link<input value={draft.galaxy_link} onChange={e=>change('galaxy_link',e.target.value)} placeholder="8 字 UID，可留空"/></label>
        <label>createtime<input type="datetime-local" value={draft.createtime} onChange={e=>change('createtime',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label>source_native_id<input value={draft.source_native_id} onChange={e=>change('source_native_id',e.target.value)}/></label>
        <label>source_place<input value={draft.source_place} onChange={e=>change('source_place',e.target.value)} placeholder="打卡地點／拍攝位置"/></label>
      </div>
      <label>title／檔名<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>url<input value={draft.url} onChange={e=>change('url',e.target.value)} placeholder="外部 URL／雲端連結，可留空，之後再補"/></label>
      <label>meta_tags<input value={draft.meta_tags} onChange={e=>change('meta_tags',e.target.value)} placeholder="建立時由資料提供者設定，逗號分隔" required/></label>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addMedia}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

function SunoImport({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  function detectId(url){
    const match=String(url||'').match(/\/song\/([0-9a-f-]{20,})/i);return match?.[1]||'';
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      if(!draft.title.trim())throw new Error('請填寫歌名。');
      if(!draft.metaTags.trim())throw new Error('Media Meta Tags 必須在建立時提供；LOC 不會自動分類。');
      const createtime=draft.createdDate?new Date(draft.createdDate+'T00:00:00+08:00').toISOString():new Date().toISOString();
      const lyricsUid=draft.lyrics.trim()?createUid8():null;
      const styleUid=lyricsUid&&draft.stylePrompt.trim()?createUid8():null;
      const sourceId=draft.source_id.trim()||(styleUid?draft.ref_id.trim():'')||null;
      const scopeData=account.scopeDataFor(scopeId);
      if(!scopeData)throw new Error('Scope data 未解析');
      const {galaxy,galaxyMedia}=scopeData;
      if(lyricsUid){
        await insertRows(galaxy,[{
          uid:lyricsUid,content_type:'lyrics',
          title:draft.title.trim(),content:draft.lyrics.trim(),createtime,
          source_id:sourceId,target_id:normalizeRelationIds(draft.target_id),ref_id:styleUid||draft.ref_id.trim()||null,
          url:draft.url.trim()||null,searchable:true,source_name:'suno'
        }]);
      }
      if(styleUid){
        await insertRows(galaxy,[{
          uid:styleUid,content_type:'instruction',
          title:draft.title.trim()+'｜Suno Style',content:draft.stylePrompt.trim(),createtime,
          target_id:[lyricsUid],searchable:false,source_name:'suno'
        }]);
      }
      await insertRows(galaxyMedia,[{
        galaxy_link:lyricsUid,
        source_native_id:draft.nativeId.trim()||detectId(draft.url)||null,media_type:'suno',
        title:draft.title.trim(),url:draft.url.trim()||null,
        meta_tags:draft.metaTags.trim()||null,createtime
      }]);
      setStatus('Suno 單筆資料已儲存。');setDraft({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
    }catch(error){setStatus(error?.message||'Suno 儲存失敗。');}
    finally{setBusy(false);}
  }
  return <div className="scope-inline-card">
    <h4>Suno 單筆匯入</h4>
    <p>Suno 無批次匯出時使用。歌詞與 Suno Style 進 Galaxy；媒體連結與 Meta Tag 進 Galaxy Media。</p>
    <form onSubmit={save} className="scope-editor">
      <label>{UI_COPY.management.songTitle}<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>{UI_COPY.management.lyrics}<textarea rows={8} value={draft.lyrics} onChange={e=>change('lyrics',e.target.value)}/></label>
      <div className="scope-stat-controls">
        <label>Suno URL<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label>Suno ID<input value={draft.nativeId} onChange={e=>change('nativeId',e.target.value)} placeholder="可由 URL 自動辨識"/></label>
        <label>日期<input type="date" value={draft.createdDate} onChange={e=>change('createdDate',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label>Suno Style<input value={draft.stylePrompt} onChange={e=>change('stylePrompt',e.target.value)}/></label>
        <label>Meta Tags<input value={draft.metaTags} onChange={e=>change('metaTags',e.target.value)} placeholder="建立時由資料提供者設定" required/></label>
      </div>
      <div className="scope-stat-controls">
        <label>source_id<input value={draft.source_id} onChange={e=>change('source_id',e.target.value)}/></label>
        <label>target_id<input value={draft.target_id} onChange={e=>change('target_id',e.target.value)}/></label>
        <label>ref_id<input value={draft.ref_id} onChange={e=>change('ref_id',e.target.value)}/></label>
      </div>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addSuno}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

export default function ManagementImportPanel({scopeId}){
  return <section className="scope-inline-card">
    <h3>{UI_COPY.management.import}</h3>
    <JsonImport scopeId={scopeId}/>
    <MediaRecordInsert scopeId={scopeId}/>
    <SunoImport scopeId={scopeId}/>
  </section>;
}
