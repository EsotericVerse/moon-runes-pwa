(() => {
  'use strict';

  const REGISTRY_URL='data/json/registries/LOC_ERA_REGISTRY.json';
  const KV_URL='https://api.lo3rwang.cc/eras';
  const LEGACY_MAP={P0:'P5.0','P0.5':'P5.1',P1:'P6.0',P2:'P6.1',P3:'P6.2',P4:'P7.0',P5:'P7.0',P6:'P7.0',P7:'P7.1',P8:'P7.2'};
  let memory=null;
  let inflight=null;

  const n=v=>String(v??'').trim();
  const order=v=>Number(v?.order??9999);
  const clean=e=>{
    const period=n(e?.period);
    const name=n(e?.name);
    return {
      ...e,
      era_id:n(e?.era_id)||('ERA-'+period),
      period,
      name,
      display_label:n(e?.display_label)||(period&&name?period+'｜'+name:(name||period)),
      start_date:n(e?.start_date),
      end_date:n(e?.end_date)||null,
      status:n(e?.status)||'released'
    };
  };

  function normalizePeriod(period){
    const p=n(period).replace(/^ERA-/i,'');
    return LEGACY_MAP[p]||p;
  }

  function isPublicPeriod(period, baselineSet){
    const p=n(period);
    if(!p)return false;
    if(baselineSet?.has(p))return true;
    return /^P\d+\.\d+$/.test(p);
  }

  function merge(baseRows, remoteRows, definitionVersion='', registryUpdatedAt=''){
    const baseline=(baseRows||[]).map(clean).filter(x=>x.period);
    const baselineSet=new Set(baseline.map(x=>x.period));
    const byPeriod=new Map(baseline.map(x=>[x.period,x]));
    const baselineDate=n(registryUpdatedAt).slice(0,10);
    for(const raw of remoteRows||[]){
      const rawVersion=n(raw?.definition_version);
      const updatedDate=n(raw?.updated_at).slice(0,10);
      const recentVersionless=!rawVersion && updatedDate && (!baselineDate || updatedDate>=baselineDate);
      if(definitionVersion && rawVersion!==n(definitionVersion) && !recentVersionless) continue;
      const row=clean(raw);
      const p=normalizePeriod(row.period);
      if(!isPublicPeriod(p,baselineSet))continue;
      const existing=byPeriod.get(p)||{};
      byPeriod.set(p,clean({...existing,...row,period:p,era_id:row.era_id&&/^ERA-P\d+\.\d+$/.test(row.era_id)?row.era_id:(existing.era_id||('ERA-'+p))}));
    }
    return [...byPeriod.values()].sort((a,b)=>order(a)-order(b)||a.period.localeCompare(b.period,undefined,{numeric:true}));
  }

  async function fetchRegistry(){
    const response=await fetch(REGISTRY_URL,{cache:'default'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }

  async function fetchKV(){
    try{
      const response=await fetch(KV_URL,{cache:'no-store',credentials:'include'});
      if(!response.ok)return null;
      const data=await response.json();
      return data?.ok&&Array.isArray(data?.eras)?data:null;
    }catch(_){
      return null;
    }
  }

  async function writeKV(payload,method='POST'){
    const response=await fetch(KV_URL,{
      method,
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.ok===false)throw new Error(data?.error||('HTTP '+response.status));
    invalidate();
    return data;
  }

  async function upsert(era){return writeKV({action:'upsert',era},'POST')}
  async function remove(period){return writeKV({action:'delete',period},'POST')}

  async function load({force=false}={}){
    if(memory&&!force)return memory;
    if(inflight&&!force)return inflight;
    inflight=(async()=>{
      const registry=await fetchRegistry();
      const kv=await fetchKV();
      const base=(registry.eras||[]).map(clean).filter(x=>x.period);
      const eras=kv?.eras?.length
        ?merge(base,kv.eras,n(registry.definition_version),n(registry.updated_at))
        :base.sort((a,b)=>order(a)-order(b)||a.period.localeCompare(b.period,undefined,{numeric:true}));
      const current=eras.find(x=>x.status==='current')||eras[eras.length-1]||null;
      const segmentCount=eras.filter(x=>x.period_type!=='parent').length;
      memory={
        version:n(registry.definition_version)||n(registry.schema_version)||'—',
        updated_at:n(kv?.updated_at)||n(registry.updated_at)||'',
        eras,
        current,
        total_count:eras.length,
        segment_count:segmentCount,
        parent_count:eras.length-segmentCount,
        legacy_map:{...(registry.legacy_period_map||LEGACY_MAP)},
        source:kv?.eras?.length?'kv+registry':'registry'
      };
      return memory;
    })();
    try{return await inflight}finally{inflight=null}
  }

  function resolveDate(date,eras){
    const d=n(date).slice(0,10);
    if(!d)return null;
    const rows=(eras||memory?.eras||[]).filter(x=>x.period_type!=='parent');
    return rows.find(x=>(!x.start_date||d>=x.start_date)&&(!x.end_date||d<=x.end_date))||null;
  }

  function findPeriod(period,eras){
    const p=normalizePeriod(period);
    return (eras||memory?.eras||[]).find(x=>x.period===p)||null;
  }

  function label(period,date,eras){
    const row=(date&&resolveDate(date,eras))||findPeriod(period,eras);
    return row?.display_label||row?.period||'';
  }

  function range(period,eras){
    const row=findPeriod(period,eras);
    return row?{start:row.start_date||'',end:row.end_date||'',row}:{start:'',end:'',row:null};
  }

  async function fillSelect(select,{includeAll=true,allLabel='全部時期',selected}={}){
    if(!select)return [];
    const data=await load();
    const current=selected??select.value;
    select.innerHTML=(includeAll?'<option value="">'+allLabel+'</option>':'')+data.eras.map(e=>'<option value="'+escapeHtml(e.period)+'">'+escapeHtml(e.display_label)+'</option>').join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
    return data.eras;
  }

  function escapeHtml(v){
    return n(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function invalidate(){memory=null;inflight=null}
  function peek(){return memory}

  window.LOCPeriods={REGISTRY_URL,KV_URL,LEGACY_MAP,load,peek,normalizePeriod,resolveDate,findPeriod,label,range,fillSelect,invalidate,merge,upsert,remove};
})();