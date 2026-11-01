// Virtual legacy relation names, backed exclusively by <scope>_anchor.
// Only the lo3rwang content Scope is cut over. Preserve Rune/Suno/local
// providers and other Scopes until their own anchor store exists.
// No SQL, DDL, table creation, migration or old-data synchronization here.
const legacyName=/^([a-z][a-z0-9]{0,14})_(time|trace|keywords|galaxy_media)$/;
const physicalColumns=['uid','type','title','description','label','invisible','links','attrs'];
const aliases={
  time:{address:'label',anchor_ids:'links',range:'attrs'},
  trace:{trace_type:'type',anchor_list:'links',times:'attrs',address:'label',route_list:'attrs'},
  keywords:{name:'title',desc:'description',lists:'links',uid_lists:'attrs'},
  galaxy_media:{url:'label',meta_tags:'description'}
};
const attrColumns=new Set(['range','times','route_list','uid_lists']);
// The existing type field alone identifies all four categories. Without a
// duplicate discriminator column, this does not introduce a second taxonomy.
const scopedTypes={
  time:['date','period','era'],
  trace:['point','path','trace'],
  keywords:['category','class','group','item']
};
const legacyToType={
  anchor:'date',time_period:'period',time_era:'era',
  space_anchor:'point',space_path:'path',space_trace:'trace',route:'path',
  '音樂':'Suno','播放清單':'playlist'
};
const oldTypeByLegacy={
  time:{date:'anchor',period:'period',era:'era'},
  trace:{point:'space_anchor',path:'path',trace:'trace'},
  galaxy_media:{Suno:'音樂',playlist:'播放清單'}
};
const toStoredType=value=>legacyToType[value]||value;
const toLegacyType=(spec,value)=>oldTypeByLegacy[spec.legacy]?.[value]||value;
const formatKeywordList=value=>value==null?null:JSON.stringify(value);
const parseKeywordList=value=>{
  if(value==null)return [];
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[]}
  catch{return []}
};
const encodeLabel=(spec,key,value)=>{
  if(spec.legacy==='trace'&&key==='address'&&value!=null)
    return typeof value==='string'?value:JSON.stringify(value);
  if(spec.legacy==='time'&&key==='address'&&value!=null)
    return String(value).slice(0,10);
  return value;
};
const decodeLabel=(spec,value)=>{
  if(spec.legacy==='trace'&&typeof value==='string'){
    try{return JSON.parse(value)}catch{return value}
  }
  return value;
};
const simpleFilters=new Set(['eq','neq','gte','lte','gt','lt','like','ilike','is','in']);
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

// Four kinds share one case-sensitive UID key. Trace/Media used to depend
// on database-generated UIDs; the unified Anchor table has no such default.
const UID_ALPHABET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function newAnchorUid(length,assigned){
  const random=globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if(!random)throw Error('Secure UID generator unavailable');
  for(let attempt=0;attempt<128;attempt++){
    const bytes=random(new Uint8Array(length*2));
    let id='';
    for(const byte of bytes){
      if(byte>=248)continue;
      id+=UID_ALPHABET[byte%62];
      if(id.length===length)break;
    }
    if(id.length===length&&!assigned.has(id))return id;
  }
  throw Error('Cannot allocate a unique unified anchor UID');
}
function defaultTimeRange(row){
  const date=String(row.address||'').slice(0,10);
  const point=toStoredType(row.type)==='date'&&/^\d{4}-\d\d-\d\d$/.test(date);
  return {version:1,segments:point?[{
    index:0,point:true,invalid:false,start_date:date,end_date:date,
    open_end:false,anchor_ids:[row.uid],start_anchor_id:row.uid,
    end_anchor_id:null,missing_anchor_ids:[]
  }]:[],invalid_period_uids:[]};
}
function prepareAnchorInsert(spec,row,assigned){
  if(!row||typeof row!=='object'||Array.isArray(row))
    throw Error('Invalid unified insert row');
  const value={...row},length=spec.legacy==='galaxy_media'?8:4;
  if(value.uid==null||value.uid===''){
    if(spec.legacy!=='trace'&&spec.legacy!=='galaxy_media')
      throw Error('Time and Keywords require an allocated UID');
    value.uid=newAnchorUid(length,assigned);
  }
  if(typeof value.uid!=='string'||!new RegExp('^[A-Za-z0-9]{'+length+'}$').test(value.uid))
    throw Error('Invalid unified anchor UID');
  if(assigned.has(value.uid))throw Error('Repeated unified anchor UID in one batch');
  assigned.add(value.uid);
  if(spec.legacy==='time'&&value.range==null)value.range=defaultTimeRange(value);
  if(spec.legacy==='trace'){
    if(!hasOwn(value,'address'))value.address=null;
    if(!hasOwn(value,'times'))value.times=[];
    if(!hasOwn(value,'route_list'))value.route_list=[];
  }
  if(spec.legacy==='keywords'&&value.uid_lists==null)value.uid_lists={};
  const mapped=toAnchorRow(spec,value);
  if(spec.legacy==='galaxy_media')mapped.attrs={};
  return mapped;
}
export function unifiedAnchorSpec(schema,table){
  const matched=String(table||'').match(legacyName);
  if(schema!=='silver'||!matched||matched[1]!=='lo3rwang')return null;
  return {table:matched[1]+'_anchor',legacy:matched[2]};
}
export function toAnchorRow(spec,row){
  if(!row||typeof row!=='object')throw Error('Invalid unified anchor row');
  const result={},attrs={};
  const type=toStoredType(row.trace_type??row.type);
  for(const [key,value] of Object.entries(row)){
    if(key==='kind'||key==='createtime'||key==='location'||key==='date')continue;
    // The Item keyword judgement list occupies label; the other levels
    // continue using links to store their child UID relationships.
    if(spec.legacy==='keywords'&&key==='lists'&&type==='item'){
      result.label=formatKeywordList(value);
      continue;
    }
    const target=aliases[spec.legacy][key]||key;
    if(attrColumns.has(key)&&target==='attrs')attrs[key]=value;
    else if(physicalColumns.includes(target)&&target!=='attrs'){
      result[target]=target==='type'?toStoredType(value):
        spec.legacy==='trace'&&key==='description'&&value&&typeof value==='object'
          ?JSON.stringify(value):encodeLabel(spec,key,value);
    }else throw Error('Unsupported legacy anchor column: '+key);
  }
  if(Object.keys(attrs).length)result.attrs=attrs;
  return result;
}
export function fromAnchorRow(spec,row){
  if(!row)return row;
  const result={},reverse=Object.fromEntries(
    Object.entries(aliases[spec.legacy]).filter(([key,value])=>value!=='attrs')
      .map(([key,value])=>[value,key])
  );
  for(const [key,value] of Object.entries(row)){
    if(key==='attrs'){
      for(const field of Object.keys(aliases[spec.legacy]).filter(k=>aliases[spec.legacy][k]==='attrs'))
        result[field]=value?.[field]??null;
    }else if(key==='label'){
      if(spec.legacy==='time'||spec.legacy==='trace')result.address=decodeLabel(spec,value);
      if(spec.legacy==='galaxy_media')result.url=value;
      if(spec.legacy==='keywords'&&row.type==='item')result.lists=parseKeywordList(value);
    }else if(key==='links'&&spec.legacy==='keywords'){
      if(row.type!=='item')result.lists=value;
    }else if(key==='type'){
      result[spec.legacy==='trace'?'trace_type':'type']=toLegacyType(spec,value);
    }else if(key==='description'&&spec.legacy==='trace'&&typeof value==='string'&&value.startsWith('{')){
      let structured=null;
      try{structured=JSON.parse(value)}catch{}
      result.description=structured&&typeof structured==='object'&&!Array.isArray(structured)?structured:value;
    }else if(key==='description'&&spec.legacy==='galaxy_media'){
      result.description=value;result.meta_tags=value;
    }else result[reverse[key]||key]=value;
  }
  // Preserve legacy Media consumers during staged physical schema migration.
  if(spec.legacy==='galaxy_media'&&!Object.hasOwn(result,'createtime'))result.createtime=null;
  return result;
}
const readColumn=(spec,name)=>aliases[spec.legacy][name]||name;
function fieldsForSelect(spec,columns){
  if(!columns||columns==='*')return physicalColumns.join(',');
  const fields=new Set(['uid']);
  for(const raw of String(columns).split(',')){
    const name=raw.trim().split(':').at(-1).trim();
    const mapped=readColumn(spec,name);
    if(!physicalColumns.includes(mapped))throw Error('Unknown unified anchor column: '+name);
    fields.add(mapped);
    if(spec.legacy==='keywords'&&name==='lists')fields.add('label');
    if(spec.legacy==='galaxy_media'&&name==='description')fields.add('description');
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
// Filters, ordering and ranges run on the physical table, with mandatory type scope.
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
      if(mapped==='attrs'){jsonFilters.push(filter);continue}
      if(!physicalColumns.includes(mapped))throw Error('Unmapped anchor filter: '+filter.column);
      physical=applyFilter(physical,{...filter,column:mapped,
        value:mapped==='type'?(Array.isArray(filter.value)
          ?filter.value.map(toStoredType):toStoredType(filter.value)):
          mapped==='label'&&spec.legacy==='trace'&&filter.column==='address'
            ?encodeLabel(spec,'address',filter.value):filter.value});
    }
    // Shared type column is the only category discriminator. Media has a
    // mandatory eight-character UID; the other categories use four.
    // Every filter remains server-side, including caller-supplied OR.
    physical=spec.legacy==='galaxy_media'
      ?physical.like('uid','________')
      :physical.in('type',scopedTypes[spec.legacy]);
    for(const expression of this.orFilters){
      if(/\b(address|times|route_list|uid_lists|range)\b/.test(expression))
        throw Error('JSONB OR filters require a native unified query');
      const rewritten=expression.replace(/([a-z][a-z0-9_]*)(?=\.)/gi,(column)=>
        readColumn(spec,column));
      physical=physical.or(rewritten);
    }
    for(const order of this.orders){
      const mapped=readColumn(spec,order.column);
      if(mapped==='attrs')throw Error('JSONB sort requires a native unified query');
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
      if(this.filters.some(f=>readColumn(spec,f.column)==='attrs')&&!selected.split(',').includes('attrs'))
        selected+=',attrs';
      const head=this.opts?.head===true;
      let query=this.schema.from(spec.table).select(selected,{
        count:this.opts.count,head:head&&!this.filters.some(f=>readColumn(spec,f.column)==='attrs')
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
      const attrs=Object.keys(this.values||{}).some(key=>readColumn(spec,key)==='attrs');
      if(attrs){
        const uid=this.filters.find(f=>f.column==='uid'&&f.method==='eq')?.value;
        if(!uid||this.orFilters.length)throw Error('Unified JSONB updates require exact UID');
        const readQuery=this.schema.from(spec.table).select('uid,attrs').eq('uid',uid);
        const read=await (spec.legacy==='galaxy_media'
          ?readQuery.like('uid','________')
          :readQuery.in('type',scopedTypes[spec.legacy])).maybeSingle();
        if(read.error)return read;
        if(!read.data)return {data:[],error:null,count:0};
        const mapped=toAnchorRow(spec,this.values);
        mapped.attrs={...(read.data.attrs||{}),...(mapped.attrs||{})};
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
