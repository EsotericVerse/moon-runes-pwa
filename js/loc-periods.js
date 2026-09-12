(() => {
  'use strict';

  const REGISTRY_URL='data/json/registries/LOC_ERA_REGISTRY.json';
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

  function normalizeRows(rows){
    return (rows||[]).map(clean).filter(x=>x.period).sort((a,b)=>order(a)-order(b)||a.period.localeCompare(b.period,undefined,{numeric:true}));
  }

  function merge(baseRows){
    return normalizeRows(baseRows);
  }

  async function fetchRegistry(){
    const response=await fetch(REGISTRY_URL);
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }

  async function load({force=false}={}){
    if(memory&&!force)return memory;
    if(inflight&&!force)return inflight;
    inflight=(async()=>{
      const registry=await fetchRegistry();
      const eras=normalizeRows(registry.eras||[]);
      const current=eras.find(x=>x.status==='current')||eras[eras.length-1]||null;
      const segmentCount=eras.filter(x=>x.period_type!=='parent').length;
      memory={
        version:n(registry.definition_version)||n(registry.schema_version)||'—',
        updated_at:n(registry.updated_at)||'',
        eras,
        current,
        total_count:eras.length,
        segment_count:segmentCount,
        parent_count:eras.length-segmentCount,
        legacy_map:{...(registry.legacy_period_map||LEGACY_MAP)},
        source:'registry'
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
  async function upsert(){throw new Error('ERA 使用靜態 LOC_ERA_REGISTRY.json；目前不使用遠端寫入。')}
  async function remove(){throw new Error('ERA 使用靜態 LOC_ERA_REGISTRY.json；目前不使用遠端寫入。')}

  window.LOCPeriods={REGISTRY_URL,LEGACY_MAP,load,peek,normalizePeriod,resolveDate,findPeriod,label,range,fillSelect,invalidate,merge,upsert,remove};
})();