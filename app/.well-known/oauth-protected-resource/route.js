// Root-level fallback for MCP clients that do not try the path-specific URI.
import {preflight,protectedResourceMetadata} from '../../loc/mcp/router.mjs';
export const dynamic='force-dynamic';
export function GET(){return protectedResourceMetadata();}
export function OPTIONS(){return preflight();}
