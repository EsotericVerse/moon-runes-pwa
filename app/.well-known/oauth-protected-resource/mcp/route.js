import {preflight,protectedResourceMetadata} from '../../../loc/mcp/router.mjs';
export const dynamic='force-dynamic';
export function GET(){return protectedResourceMetadata();}
export function OPTIONS(){return preflight();}
