// Public capability handshake for an optional LOC HTTP numeric cache host.
// This route only exists in the Next.js API deployment, not static export.
export function GET(){
  return Response.json({
    id:'loc-isr-capabilities',
    version:1,
    capabilities:{numericHttpCache:true,incrementalRegeneration:false}
  },{headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
}
