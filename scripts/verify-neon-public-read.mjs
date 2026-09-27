const PUBLIC_READ='https://br-restless-salad-b38eyn0q-locpublic.compute.c-4.ap-southeast-1.aws.neon.tech/';

async function probe(table,columns,filters=[]){
  const response=await fetch(PUBLIC_READ,{
    method:'POST',
    headers:{'content-type':'application/json','origin':'https://loc.lo3rwang.cc'},
    body:JSON.stringify({operation:'select',table,columns,filters,limit:1,offset:0,count:'exact'})
  });
  const body=await response.text();
  console.log(JSON.stringify({table,status:response.status,allowOrigin:response.headers.get('access-control-allow-origin'),body:body.slice(0,500)}));
  if(!response.ok)throw new Error(table+' public Function probe failed: '+response.status+' '+body);
  const parsed=JSON.parse(body);
  if(parsed?.error)throw new Error(table+': '+parsed.error.message);
  if(!Array.isArray(parsed?.data))throw new Error(table+': invalid data payload');
}

await probe('silver.lrunes','rune_number,rune_name,record_type',[{column:'record_type',operator:'eq',value:'rune'}]);
await probe('silver.manage','record_id,record_type,scope_id',[{column:'scope_id',operator:'eq',value:'lo3rwang'}]);
await probe('silver.v_lo3rwang_source_catalog','source_name,work_count',[{column:'scope_id',operator:'eq',value:'lo3rwang'}]);
console.log('Public Neon Function read probe passed.');
