// Public read endpoints support the independent GitHub Pages frontend.
// Only approved LOC origins may read cross-origin responses; never allow
// cross-origin credentials or weaken the authenticated invalidation RPC.
const PUBLIC_WEB_ORIGINS=new Set([
  'https://loc.lo3rwang.cc',
  'https://esotericverse.github.io'
]);

export function withLocCors(response,request,{methods='GET, OPTIONS'}={}){
  const origin=request.headers.get('origin');
  if(!origin||!PUBLIC_WEB_ORIGINS.has(origin))return response;
  response.headers.set('Access-Control-Allow-Origin',origin);
  response.headers.set('Vary','Origin');
  response.headers.set('Access-Control-Allow-Methods',methods);
  response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  response.headers.set('Access-Control-Max-Age','86400');
  return response;
}

export function locCorsPreflight(request,options={}){
  const origin=request.headers.get('origin');
  if(!origin||!PUBLIC_WEB_ORIGINS.has(origin))
    return new Response(null,{status:403});
  return withLocCors(new Response(null,{status:204}),request,options);
}
