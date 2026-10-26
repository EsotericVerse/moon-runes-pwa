import {withLocCors,locCorsPreflight} from '../../../../_cors';

// ISR is suspended indefinitely. No SQL reads or cache writes.
export async function GET(request){
  return withLocCors(Response.json({error:'ISR suspended; use the direct data provider'},{
    status:410,headers:{'Cache-Control':'no-store'}
  }),request);
}
export function OPTIONS(request){return locCorsPreflight(request);}
