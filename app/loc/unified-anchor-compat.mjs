// One shared Anchor table. attr contains only the value or relation needed
// for each type; never cache Galaxy article UIDs or derived interval objects.
const legacyName=/^([a-z][a-z0-9]{0,14})_(time|trace|keywords|galaxy_media)$/;
const physicalColumns=['uid','type','title','description','invisible','attr'];
const legacyKinds={time:'time',trace:'trace',keywords:'keywords',galaxy_media:'media'};
const scopeTypes={
 time:['date','period','era'],trace:['point','path','trace'],
 keywords:['category','class','group','item'],media:['image','video','rune','suno']
};
const aliases={
 time:{address:'attr',anchor_ids:'attr',range:'attr'},
 trace:{trace_type:'type',anchor_list:'attr',address:'attr',times:'attr',route_list:'attr'},
 keywords:{name:'title',desc:'description',lists:'attr',uid_lists:'attr'},
 galaxy_media:{url:'attr',meta_tags:'description'}
};
const realTypes={anchor:'date',space_anchor:'point','音樂':'suno','播放清單':'suno',runes:'rune'};
const physicalType=value=>realTypes[String(value)]||String(value);
const legacyType=value=>({date:'anchor',point:'space_anchor'})[value]||value;
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const toArray=value=>{
 if(Array.isArray(value))return value;
 if(typeof value==='string'){try{const decoded=JSON.parse(value);return Array.isArray(decoded)?decoded:[]}catch{return []}}
 return [];
};
const articleUid=/^[A-Za-z0-9]{8}$/;
const anchorUid=/^[A-Za-z0-9]{8}$/;
const UID_ALPHABET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function newAnchorUid(length=8,assigned=new Set()){
 const random=globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
 if(!random)throw Error('Secure UID generator unavailable');
 for(let attempt=0;attempt<128;attempt++){
  const bytes=random(new Uint8Array(length*2));
  let id='';
  for(const byte of bytes){if(byte>=248)continue;id+=UID_ALPHABET[byte%62];if(id.length===length)break;}
  if(id.length===length&&!assigned.has(id))return id;
 }
 throw Error('Cannot allocate unique Anchor UID');
}
function compactKeywordAnalysis(type,value){
 if(type!=='group'&&type!=='item')return {};
 const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 let total=Number(obj.total);
 if(!Number.isSafeInteger(total)||total<0){
  if(type==='group'){
   total=new Set(toArray(Array.isArray(value)?value:obj.articles??obj.uidlists)).size;
  }else{
   const hits=toArray(Array.isArray(value)?value:obj.hits);
   total=hits.reduce((n,h)=>n+(Number.isSafeInteger(h?.times)&&h.times>0?h.times:0),0);
  }
 }
 return Number.isSafeInteger(total)&&total>=0?{total}:{};
}
function canonicalAttr(type,value){
 const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const result={};
 const allowed={
  date:['date'],period:['date','uid'],era:['date','period'],
  point:['longitude','latitude','location'],path:['point'],trace:['point','path'],
  image:['url','date'],video:['url','date'],rune:['url','date'],suno:['url','date'],
  category:['uid'],class:['uid'],group:['uid','total'],item:['keyword','total']
 }[type]||[];
 for(const key of allowed)if(hasOwn(obj,key)&&obj[key]!=null)result[key]=obj[key];
 return result;
}
function prepareAnchorInsert(spec,row,assigned){
 if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Invalid unified insert row');
 const value={...row};
 if(value.uid==null||value.uid==='')value.uid=newAnchorUid(8,assigned);
 if(typeof value.uid!=='string'||!anchorUid.test(value.uid))throw Error('Anchor UID must be exactly eight case-sensitive characters');
 if(assigned.has(value.uid))throw Error('Repeated Anchor UID in batch');
 assigned.add(value.uid);
 return toAnchorRow(spec,value);
}
export function unifiedAnchorSpec(schema,table){
 const matched=String(table||'').match(legacyName);
 if(schema!=='silver'||!matched||matched[1]!=='lo3rwang')return null;
 return {table:matched[1]+'_anchor',kind:legacyKinds[matched[2]],legacy:matched[2]};
}
export function toAnchorRow(spec,row){
 if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Invalid unified Anchor row');
 const d={...row},out={},type=physicalType(d.trace_type||d.type||'');
 if(type)out.type=type;
 for(const key of ['uid','title','invisible'])if(hasOwn(d,key))out[key]=d[key];
 if(hasOwn(d,'name'))out.title=d.name;
 if(hasOwn(d,'description'))out.description=spec.kind==='trace'&&d.description&&typeof d.description==='object'?JSON.stringify(d.description):d.description;
 if(hasOwn(d,'desc'))out.description=d.desc;
 if(hasOwn(d,'meta_tags'))out.description=d.meta_tags;
 let attr=canonicalAttr(type,d.attr);
 if(spec.kind==='time'){
  if(hasOwn(d,'address')&&(type==='date'||!type))attr.date=String(d.address??'').slice(0,10);
  if(hasOwn(d,'anchor_ids')&&type!=='date')attr[type==='era'?'period':'uid']=toArray(d.anchor_ids);
  if(hasOwn(d,'label')&&!hasOwn(d,'address')&&!hasOwn(d,'anchor_ids')){
   if(type==='date')attr.date=String(d.label??'').slice(0,10);
   else attr[type==='era'?'period':'uid']=toArray(d.label);
  }
 }else if(spec.kind==='trace'){
  if(hasOwn(d,'address')&&(type==='point'||!type)){
   const coords=toArray(d.address);
   if(coords.length===2&&coords.every(x=>Number.isFinite(Number(x)))){
    attr.longitude=Number(coords[0]);attr.latitude=Number(coords[1]);
   }
  }
  if(hasOwn(d,'location')&&type==='point')attr.location=toArray(d.location);
  if(hasOwn(d,'anchor_list')&&type!=='point')attr.point=toArray(d.anchor_list);
  if(hasOwn(d,'label')&&!hasOwn(d,'address')&&!hasOwn(d,'anchor_list'))
   if(type==='point'){
    const coords=toArray(d.label);
    if(coords.length===2&&coords.every(x=>Number.isFinite(Number(x)))){
      attr.longitude=Number(coords[0]);attr.latitude=Number(coords[1]);
    }
   }else attr.point=toArray(d.label);
  if(type==='trace'&&d.route_list){
   const route=d.route_list;
   if(Array.isArray(route.routes))attr.path=[...route.routes];
   if(Array.isArray(route.segments))attr.point=route.segments.map(pair=>[...pair]);
  }
 }else if(spec.kind==='keywords'){
  if(hasOwn(d,'lists'))attr[type==='item'?'keyword':'uid']=toArray(d.lists);
  if(hasOwn(d,'label')&&!hasOwn(d,'lists'))attr[type==='item'?'keyword':'uid']=toArray(d.label);
  if(hasOwn(d,'uid_lists')){
   const compact=compactKeywordAnalysis(type,d.uid_lists);
   if(hasOwn(compact,'total'))attr.total=compact.total;
  }
 }else if(spec.kind==='media'){
  if(hasOwn(d,'url')&&d.url)attr.url=d.url;
  if(hasOwn(d,'label')&&!hasOwn(d,'url')&&d.label)attr.url=d.label;
  if(hasOwn(d,'createtime')&&d.createtime)attr.date=String(d.createtime).slice(0,10);
 }
 if(hasOwn(d,'attrs'))attr={...attr,...canonicalAttr(type,d.attrs)};
 if(spec.kind==='keywords'&&(type==='group'||type==='item')&&hasOwn(d,'attr')){
  const compact=compactKeywordAnalysis(type,d.attr);
  if(hasOwn(compact,'total')&&!hasOwn(attr,'total'))attr.total=compact.total;
 }
 attr=canonicalAttr(type,attr);
 // No stale uidlists, routes, segments, version, index, or article UID caches.
 if(Object.keys(attr).length||hasOwn(d,'attr')||hasOwn(d,'attrs')||
    ['address','anchor_ids','anchor_list','lists','uid_lists','url','label','route_list'].some(k=>hasOwn(d,k)))out.attr=attr;
 for(const key of Object.keys(d)){
  if(['uid','type','trace_type','title','name','invisible','description','desc',
   'address','anchor_ids','range','anchor_list','times','route_list','lists',
   'uid_lists','url','meta_tags','createtime','location','label','attr','attrs'].includes(key))continue;
  throw Error('Unsupported legacy Anchor column: '+key);
 }
 return out;
}
export function fromAnchorRow(spec,row){
 if(!row)return row;
 const out={};
 for(const key of ['uid','title','invisible','description'])if(hasOwn(row,key))out[key]=row[key];
 if(hasOwn(row,'type'))out.type=legacyType(row.type);
 const a=canonicalAttr(row.type,row.attr),legacy=row.label;
 if(spec.kind==='time'){
  out.address=row.type==='date'?(a.date??legacy??null):null;
  out.anchor_ids=row.type==='date'?[]:toArray(a[row.type==='era'?'period':'uid']??legacy);
  out.range=null;
 }else if(spec.kind==='trace'){
  out.trace_type=legacyType(row.type);
  out.anchor_list=row.type==='point'?[]:toArray(a.point??legacy);
  out.address=row.type==='point'&&Number.isFinite(a.longitude)&&Number.isFinite(a.latitude)?[a.longitude,a.latitude]:
   row.type==='point'?toArray(legacy):null;
  out.times=[];
  out.route_list=row.type==='trace'?{routes:toArray(a.path),segments:toArray(a.point)}:
   {routes:[],segments:[],postal_address:''};
  if(typeof out.description==='string'&&out.description.startsWith('{')){
   try{const parsed=JSON.parse(out.description);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))out.description=parsed}catch{}
  }
 }else if(spec.kind==='keywords'){
  out.name=row.title;out.desc=row.description;
  out.lists=toArray(a[row.type==='item'?'keyword':'uid']??legacy);
  out.uid_lists=['item','group'].includes(row.type)?{total:Number(a.total)||0}:[];
 }else if(spec.kind==='media'){
  out.url=a.url??legacy??null;out.meta_tags=row.description??null;
  out.createtime=a.date??null;out.location=null;
  if(row.type==='suno'&&/^https?:\/\/(?:www\.)?suno\.com\/playlist\//i.test(String(out.url||'')))out.type='播放清單';
 }
 return out;
}
const readColumn=(spec,name)=>aliases[spec.legacy][name]||name;
function fieldsForSelect(spec,columns){
 if(!columns||columns==='*')return physicalColumns.join(',');
 const fields=new Set(['uid','type']);
 for(const raw of String(columns).split(',')){
   const name=raw.trim().split(':').at(-1).trim(),mapped=readColumn(spec,name);
   // A few old media readers still request these removed fields. They are
   // nullable compatibility projections, not aliases to UID or other data.
   if(spec.kind==='media'&&['createtime','location'].includes(name))continue;
   if(spec.kind==='time'&&name==='range')continue;
   if(!physicalColumns.includes(mapped))throw Error('Unknown unified anchor column: '+name);
   fields.add(mapped);
 }
 return [...fields].join(',');
}
const applyFilter=(query,filter)=>{
  if(filter.method==='not')return query.not(filter.column,filter.operator,filter.value);
  if(filter.method==='in')return query.in(filter.column,filter.value);
  return query[filter.method](filter.column,filter.value);
};
function evalFilter(row,filter){
  const a=row[filter.column],b=filter.value;
  switch(filter.method){
    case 'eq':return JSON.stringify(a)===JSON.stringify(b);
    case 'neq':return JSON.stringify(a)!==JSON.stringify(b);
    case 'is':return b===null?a==null:a===b;
    case 'in':return (b||[]).includes(a);
    case 'gt':return a>b;
    case 'gte':return a>=b;
    case 'lt':return a<b;
    case 'lte':return a<=b;
    case 'like':case 'ilike':{
      const text=String(a??''),expr=String(b).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/%/g,'.*').replace(/_/g,'.');
      return new RegExp('^'+expr+'$',filter.method==='ilike'?'i':'').test(text);
    }
    case 'not':return !evalFilter(row,{...filter,method:filter.operator});
    default:throw Error('Unsupported unified anchor filter: '+filter.method);
  }
}
const normalizeResult=(spec,result,columns,one)=>{
  if(result?.error)return result;
  const project=row=>{
    if(!row)return null;
    const projected=fromAnchorRow(spec,row);
    if(!columns||columns==='*')return projected;
    return Object.fromEntries(String(columns).split(',').map(name=>{
      const [alias,source]=name.includes(':')?name.split(':'):[name,name];
      return [alias.trim(),projected[source.trim()]];
    }));
  };
  if(one){
    const list=Array.isArray(result.data)?result.data:result.data?[result.data]:[];
    return {...result,
      error:one==='single'&&list.length!==1?{message:'Single row expected'}:null,
      data:project(list[0])};
  }
  return {...result,data:Array.isArray(result?.data)?result.data.map(project):result?.data};
};
// One builder implements the subset used by db-query and feature reads/writes.
// Filters, ordering and ranges run on the physical table, with mandatory kind.
// attrs (JSONB legacy fields) are merged on writes, never overwritten blindly.
export function unifiedAnchorRelation(schema,spec){
  return new UnifiedQuery(schema,spec);
}
class UnifiedQuery{
  constructor(schema,spec){
    this.schema=schema;this.spec=spec;this.operation='select';this.fields='*';
    this.filters=[];this.orders=[];this.offset=0;this.maximum=10000;
    this.opts={};this.one='';this.values=null;this.orFilters=[];
    this.abort=null;this.conflict=null;
  }
  select(columns='*',options={}){this.fields=columns;this.opts=options||{};return this}
  insert(rows){this.operation='insert';this.values=rows;return this}
  upsert(rows,options={}){this.operation='upsert';this.values=rows;this.conflict=options;return this}
  update(values){this.operation='update';this.values=values;return this}
  delete(){this.operation='delete';return this}
  eq(column,value){return this.filter(column,'eq',value)}
  neq(column,value){return this.filter(column,'neq',value)}
  gt(column,value){return this.filter(column,'gt',value)}
  gte(column,value){return this.filter(column,'gte',value)}
  lt(column,value){return this.filter(column,'lt',value)}
  lte(column,value){return this.filter(column,'lte',value)}
  is(column,value){return this.filter(column,'is',value)}
  like(column,value){return this.filter(column,'like',value)}
  ilike(column,value){return this.filter(column,'ilike',value)}
  in(column,value){return this.filter(column,'in',value)}
  not(column,operator,value){return this.filter(column,'not',value,operator)}
  filter(column,method,value,operator=''){
    if(!simpleFilters.has(method)&&method!=='not')throw Error('Unsupported anchor filter '+method);
    this.filters.push({column,method,value,operator});return this;
  }
  or(text){this.orFilters.push(String(text));return this}
  order(column,options={}){this.orders.push({column,ascending:options.ascending!==false,nullsFirst:options.nullsFirst});return this}
  range(start,end){this.offset=Math.max(0,Number(start)||0);this.maximum=Math.max(0,Number(end)-this.offset+1);return this}
  limit(value){this.maximum=Math.max(0,Number(value)||0);return this}
  single(){this.one='single';return this}
  maybeSingle(){this.one='maybeSingle';return this}
  abortSignal(value){this.abort=value;return this}
  throwOnError(){this.throwErrors=true;return this}
  returns(){return this}
  then(resolve,reject){return this.run().then(resolve,reject)}
  catch(reject){return this.run().catch(reject)}
  finally(fn){return this.run().finally(fn)}
  build(physical,includeRange=true){
    const spec=this.spec;
    const jsonFilters=[];
    for(const filter of this.filters){
      const mapped=readColumn(spec,filter.column);
      if(mapped==='attr'){jsonFilters.push(filter);continue}
      // A timestamp filter cannot be silently converted into a UID filter.
      if(spec.kind==='media'&&['createtime','location'].includes(filter.column))
        throw Error('Media '+filter.column+' filtering requires article Galaxy.date/media_link');
      if(!physicalColumns.includes(mapped))throw Error('Unmapped anchor filter: '+filter.column);
      physical=applyFilter(physical,{...filter,column:mapped,
        value:mapped==='type'&&filter.method==='in'?(filter.value||[]).map(physicalType):
          mapped==='type'&&typeof filter.value==='string'?physicalType(filter.value):filter.value});
    }
    // The physical kind predicate cannot be overridden by caller-controlled
    // filters, including OR expressions.
    physical=physical.in('type',scopeTypes[spec.kind]);
    for(const expression of this.orFilters){
      if(/\b(address|times|route_list|uid_lists|range)\b/.test(expression))
        throw Error('JSONB OR filters require a native unified query');
      const rewritten=expression.replace(/([a-z][a-z0-9_]*)(?=\.)/gi,(column)=>
        readColumn(spec,column));
      physical=physical.or(rewritten);
    }
    for(const order of this.orders){
      // Media has no creation timestamp by design. Sort its legacy lists by
      // title instead of the unrelated UID (which is not a time key).
      const mapped=spec.kind==='media'&&order.column==='createtime'?'title':readColumn(spec,order.column);
      if(mapped==='attr')throw Error('JSONB sort requires a native unified query');
      physical=physical.order(mapped,{ascending:order.ascending,nullsFirst:order.nullsFirst});
    }
    // Supabase postgrest builders support abortSignal; KyselyEdge builders do not.
    // Their fetch already has its own bounded timeout. Never call an absent method.
    if(this.abort&&typeof physical.abortSignal==='function')physical=physical.abortSignal(this.abort);
    if(includeRange)physical=physical.range(this.offset,this.offset+Math.max(1,this.maximum)-1);
    return {physical,jsonFilters};
  }
  async run(){
    const spec=this.spec;
    if(this.operation==='select'){
      let selected=fieldsForSelect(spec,this.fields);
      if(this.filters.some(f=>readColumn(spec,f.column)==='attr')&&!selected.split(',').includes('attr'))
        selected+=',attr';
      const head=this.opts?.head===true;
      let query=this.schema.from(spec.table).select(selected,{
        count:this.opts.count,head:head&&!this.filters.some(f=>readColumn(spec,f.column)==='attr')
      });
      const {physical,jsonFilters}=this.build(query,false);
      if(!jsonFilters.length){
        const result=await physical.range(this.offset,this.offset+Math.max(1,this.maximum)-1);
        return normalizeResult(spec,result,this.fields,this.one);
      }
      // Small legacy JSONB projections are filtered locally until the
      // Kysely SQL gateway accepts indexed JSON path predicates.
      // Bound each scan and fail rather than silently truncate matches.
      const rows=[],size=1000,cap=10000;
      for(let start=0;start<cap;start+=size){
        const page=await physical.range(start,start+size-1);
        if(page.error)return page;
        rows.push(...(page.data||[]));
        if((page.data||[]).length<size)break;
        if(start+size===cap)throw Error('Unified anchor JSON filter exceeded bounded scan');
      }
      let filtered=rows.map(r=>fromAnchorRow(spec,r)).filter(row=>jsonFilters.every(f=>evalFilter(row,f)));
      // Preserve caller's requested offset even when JSON filtering.
      const count=filtered.length;
      filtered=filtered.slice(this.offset,this.offset+this.maximum).map(row=>
        this.fields==='*'?row:Object.fromEntries(String(this.fields).split(',').map(key=>[key.trim(),row[key.trim()]])));
      return {data:this.one?(filtered[0]||null):head?null:filtered,
        error:this.one==='single'&&filtered.length!==1?{message:'Single row not found'}:null,
        count:this.opts.count?count:null};
    }
    if(this.operation==='insert'||this.operation==='upsert'){
      const rows=Array.isArray(this.values)?this.values:[this.values];
      if(!rows.length)throw Error('Empty unified anchor insert');
      const auto=rows.some(row=>row?.uid==null||row.uid==='');
      if(this.operation==='upsert'&&auto)
        throw Error('Unified anchor upsert requires an explicit UID');
      const options=this.operation==='upsert'?{...this.conflict,onConflict:'uid'}:undefined;
      for(let attempt=0;attempt<(auto?4:1);attempt++){
        const assigned=new Set();
        const mapped=rows.map(row=>prepareAnchorInsert(spec,row,assigned));
        let q=this.operation==='upsert'?this.schema.from(spec.table).upsert(mapped,options):
          this.schema.from(spec.table).insert(mapped);
        if(this.fields!=='*')q=q.select(fieldsForSelect(spec,this.fields));
        const result=await q;
        if(result.error?.code==='23505'&&auto&&attempt<3)continue;
        return normalizeResult(spec,result,this.fields);
      }
    }
    if(this.operation==='update'){
      if(!this.filters.length&&!this.orFilters.length)throw Error('Unsafe unified anchor update');
      // All updates of JSONB-backed fields are read/merged per UID so they
      // never erase unrelated attributes. Bulk unfiltered mutation is denied.
      const attrs=Object.keys(this.values||{}).some(key=>readColumn(spec,key)==='attr');
      if(attrs){
        const uid=this.filters.find(f=>f.column==='uid'&&f.method==='eq')?.value;
        if(!uid||this.orFilters.length)throw Error('Unified JSONB updates require exact UID');
        const read=await this.schema.from(spec.table).select('uid,type,attr').eq('uid',uid).in('type',scopeTypes[spec.kind]).maybeSingle();
        if(read.error)return read;
        if(!read.data)return {data:[],error:null,count:0};
        const mapped=toAnchorRow(spec,{type:read.data.type,...this.values});
        // Trace may have independent optional attributes. Never merge stale
        // Time/Keywords JSON, or cleanup would be undone on the next save.
        if(mapped.attr) mapped.attr=canonicalAttr(read.data.type,{
          ...canonicalAttr(read.data.type,read.data.attr),...mapped.attr
        });
        let q=this.schema.from(spec.table).update(mapped);
        const {physical}=this.build(q,false);
        const res=await physical.select(fieldsForSelect(spec,this.fields));
        return normalizeResult(spec,res,this.fields);
      }
      let q=this.schema.from(spec.table).update(toAnchorRow(spec,this.values));
      const {physical}=this.build(q,false);
      const res=await physical.select(fieldsForSelect(spec,this.fields));
      return normalizeResult(spec,res,this.fields);
    }
    if(this.operation==='delete'){
      if(!this.filters.length&&!this.orFilters.length)throw Error('Unsafe unified anchor delete');
      const q=this.schema.from(spec.table).delete();
      const {physical}=this.build(q,false);
      const res=await physical.select(fieldsForSelect(spec,this.fields));
      return normalizeResult(spec,res,this.fields);
    }
  }
}
