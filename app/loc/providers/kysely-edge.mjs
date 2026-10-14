class KyselyQuery {
  constructor(execute,schema,table){this.executeRequest=execute;this.request={kind:'query',schema,table,operation:'select',columns:['*'],filters:[],or:[],orders:[],limit:1000,offset:0}}
  select(columns='*',options={}){this.request.columns=String(columns||'*').split(',').map(x=>x.trim()).filter(Boolean);this.request.count=options.count||null;this.request.head=options.head===true;if(this.request.operation!=='select')this.request.returning=true;return this}
  insert(values){this.request.operation='insert';this.request.values=values;return this}
  update(values){this.request.operation='update';this.request.values=values;return this}
  delete(){this.request.operation='delete';return this}
  upsert(values,options={}){this.request.operation='upsert';this.request.values=values;this.request.onConflict=String(options.onConflict||'').split(',').map(x=>x.trim()).filter(Boolean);this.request.ignoreDuplicates=options.ignoreDuplicates===true;return this}
  _filter(column,operator,value,negate=false){this.request.filters.push({column,operator,value,negate});return this}
  eq(column,value){return this._filter(column,'eq',value)}
  neq(column,value){return this._filter(column,'neq',value)}
  gt(column,value){return this._filter(column,'gt',value)}
  gte(column,value){return this._filter(column,'gte',value)}
  lt(column,value){return this._filter(column,'lt',value)}
  lte(column,value){return this._filter(column,'lte',value)}
  like(column,value){return this._filter(column,'like',value)}
  ilike(column,value){return this._filter(column,'ilike',value)}
  is(column,value){return this._filter(column,'is',value)}
  in(column,value){return this._filter(column,'in',value)}
  not(column,operator,value){return this._filter(column,operator,value,true)}
  or(expression){this.request.or.push(String(expression));return this}
  order(column,options={}){this.request.orders.push({column,ascending:options.ascending!==false});return this}
  limit(value){this.request.limit=value;return this}
  range(from,to){this.request.offset=from;this.request.limit=Math.max(0,to-from+1);return this}
  single(){this.request.single='single';return this}
  maybeSingle(){this.request.single='maybeSingle';return this}
  then(resolve,reject){return this.executeRequest(this.request).then(resolve,reject)}
}

function parseContentRange(value){const match=String(value||'').match(/\/(\d+)$/);return match?Number(match[1]):null}

export function createKyselyEdgeClient({url,publishableKey,auth,role='authenticated',target='configured',fetch:fetchImpl=globalThis.fetch}={}){
  if(!url||!publishableKey||typeof fetchImpl!=='function')throw new Error('Kysely Edge requires a project URL, publishable key and fetch');
  const endpoint=String(url).replace(/\/+$/,'')+'/functions/v1/loc-kysely';
  async function execute(body){
    let token='';
    if(auth){const result=await auth.getSession();token=result?.data?.session?.access_token||'';if(result?.error)throw result.error;if(!token)throw new Error('Authenticated database request requires an active session')}
    const headers={'content-type':'application/json',apikey:publishableKey};
    if(token)headers.authorization='Bearer '+token;
    const request={method:'POST',headers,body:JSON.stringify({...body,target})};
    let response;
    for(let attempt=0;attempt<2;attempt++){
      response=await fetchImpl(endpoint,request);
      if(response.ok||body.kind!=='query'||body.operation!=='select'||response.status!==503||attempt===1)break;
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    let payload=null;try{payload=await response.json()}catch{}
    if(!response.ok){const error=new Error(payload?.error?.message||payload?.message||`Kysely request failed (HTTP ${response.status})`);error.status=response.status;error.code=payload?.error?.code;error.details=payload?.error?.details;throw error}
    if(body.kind==='rpc')return {data:payload?.data??null,error:null,status:response.status};
    const count=payload?.count??parseContentRange(response.headers.get('content-range'));
    return {data:payload?.data??null,error:null,count,status:response.status};
  }
  const client={
    schema(schema){return {from(table){return new KyselyQuery(execute,schema,table)},rpc(name,args={}){return execute({kind:'rpc',schema,name,args,target})}}},
    rpc(name,args={},options={}){return execute({kind:'rpc',schema:options.schema||'silver',name,args,target})},
    auth:auth||null,
    activeTarget(){return execute({kind:'status',name:'active_public_target'});},
    role,target
  };
  return client;
}
