import {preflight,protectedResourceMetadata} from '../../../app/loc/mcp/router.mjs';
export function onRequestGet(context){return protectedResourceMetadata(context.env);}
export function onRequestOptions(){return preflight();}
