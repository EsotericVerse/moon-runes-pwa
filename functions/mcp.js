import {handleMcp} from '../app/loc/mcp/router.mjs';
// Existing Cloudflare Pages project serves static Next.js pages and this API route.
export function onRequest(context){return handleMcp(context.request,context.env);}
