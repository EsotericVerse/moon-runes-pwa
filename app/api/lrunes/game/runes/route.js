import {NextResponse}from'next/server';
import fs from'node:fs/promises';import path from'node:path';

// TEMPORARY ALPHA PROVIDER.
// This route deliberately creates a server-side boundary now so GameClient never owns
// canonical storage access. Replace readLegacyProjection() with PostgreSQL projection
// after the Neon migration; do not expose private governance/source columns here.
async function readLegacyProjection(){const file=path.join(process.cwd(),'data/json/core/runes.json');return JSON.parse(await fs.readFile(file,'utf8'));}
function gameSafe(row){return{編號:row['編號'],符文名稱:row['符文名稱'],英文:row['英文'],所屬分組:row['所屬分組'],角色行動:row['角色行動']||''};}
export async function GET(){try{const rows=await readLegacyProjection();return NextResponse.json({source:'temporary-server-projection',runes:rows.filter(r=>Number(r['編號'])>=1&&Number(r['編號'])<=66).map(gameSafe)},{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'rune_projection_unavailable'},{status:503});}}
