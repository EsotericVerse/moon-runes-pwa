import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { sql } from "npm:kysely@0.29.6";
import {databaseForTarget,resolveConnectionProfile} from "./drivers.ts";
import { executeAllowlistedRpc, executeKyselyQuery, isKyselyClientError } from "../../../app/loc/providers/kysely-runtime.mjs";
import { adaptNeonThemeRequest, normalizeNeonThemeRows } from "../../../app/loc/providers/neon-theme-compat.mjs";
import { selectedDatabaseTarget } from "../../../app/loc/providers/selected-database-target.mjs";
import {resolveSqlExecutionPort} from "../../../app/loc/providers/sql-engine-ports.mjs";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
};
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
function configuredPublishableKeys() {
  const keys = [Deno.env.get("LOC_KYSELY_PUBLISHABLE_KEY"), Deno.env.get("SUPABASE_PUBLISHABLE_KEY"), Deno.env.get("SUPABASE_ANON_KEY")].filter((value): value is string => Boolean(value));
  try {
    const keyMap = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (keyMap && typeof keyMap === "object" && !Array.isArray(keyMap)) keys.push(...Object.values(keyMap).filter((value): value is string => typeof value === "string"));
  } catch {
    console.error("[loc-kysely] SUPABASE_PUBLISHABLE_KEYS is not valid JSON");
  }
  return new Set(keys);
}
const publishableKeys = configuredPublishableKeys();
const neonLocReadTables = new Set([
  "game", "keyword_classes", "lo3rwang", "lo3rwang_blocks", "lo3rwang_galaxy",
  "lo3rwang_galaxy_media", "lo3rwang_keywords", "lo3rwang_time", "loc_blocks",
  "loc_search_keywords", "loc_theme", "lrunes", "lrunes_blocks", "lrunes_daily",
  "lrunes_galaxy", "lrunes_galaxy_media", "lrunes_time", "manage", "runes",
  "runes_etc", "runes_group", "scope_group_source_sharing", "scope_other_sources",
  "scope_registry", "scope_source_subcategories", "statistics_source_aliases",
  "statistics_source_categories",
]);

const controlTarget={provider:"supabase",engine:"postgres",connection_alias:"supabase_current",connection_mode:"pooler"};
async function executeRequest(trx: any, target: Record<string,any>, role: string, claims: Record<string, unknown>, body: Record<string, unknown>) {
  const executionPort=resolveSqlExecutionPort(target);
  if(executionPort.session!=="postgres-rls"){
    // No PostgreSQL RLS or set-local-role on other engines. Until the target's
    // authorization adapter exists, permit only the public LOC read surface.
    if(body.kind!=="query"||body.operation!=="select"||body.schema!=="silver"||typeof body.table!=="string"||!neonLocReadTables.has(body.table))
      throw Object.assign(new Error("Cross-engine target only permits public LOC reads"),{httpStatus:403});
    return await executeKyselyQuery(trx,body,{dialect:executionPort.engine});
  }
  if (role === "authenticated") await sql`set local role authenticated`.execute(trx);
  else if (target.provider === "neon") await sql`set local role anonymous`.execute(trx);
  else await sql`set local role anon`.execute(trx);
  await sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`.execute(trx);
  await sql`select set_config('request.jwt.claim.sub', ${String(claims.sub || "")}, true)`.execute(trx);
  await sql`select set_config('request.jwt.claim.role', ${role}, true)`.execute(trx);
  if(body.kind==="query"){
    const theme=target.provider==="neon"?adaptNeonThemeRequest(body):null;
    const result=await executeKyselyQuery(trx,theme?.request||body);
    if(theme)result.data=normalizeNeonThemeRows(result.data,theme.columns);
    return result;
  }
  return await executeAllowlistedRpc(trx,body);
}

async function selectTargetAtomically(id:string,role:string,claims:Record<string,unknown>){
  if(role!=="authenticated"||!id||!/^[a-z][a-z0-9_-]{0,80}$/i.test(id))
    throw Object.assign(new Error("Authorized target ID required"),{httpStatus:403});
  const db=await databaseForTarget(controlTarget);
  return db.transaction().execute(async trx=>{
    await sql`set local role authenticated`.execute(trx);
    await sql`select set_config('request.jwt.claims',${JSON.stringify(claims)},true)`.execute(trx);
    await sql`select set_config('request.jwt.claim.sub',${String(claims.sub||"")},true)`.execute(trx);
    const grant=await sql`select silver.can_manage_global() as allowed`.execute(trx);
    if(grant.rows[0]?.allowed!==true)throw Object.assign(new Error("Administrator permission is required"),{httpStatus:403});
    const row=await trx.selectFrom("silver.database_targets")
      .select(["target_id","provider","engine","connection_alias","connection_mode"])
      .where("target_id","=",id).executeTakeFirst();
    if(!row)throw Object.assign(new Error("Database target does not exist"),{httpStatus:400});
    const target=selectedDatabaseTarget([{...row,selected:true}]);
    resolveConnectionProfile(target); // fail closed when the server secret is absent
    await trx.updateTable("silver.database_targets").set({selected:false}).where("selected","=",true).execute();
    const updated=await trx.updateTable("silver.database_targets").set({selected:true,updated_at:new Date()})
      .where("target_id","=",id).executeTakeFirstOrThrow();
    if(Number(updated.numUpdatedRows||0)!==1)throw new Error("Database target activation failed");
    return {target_id:id,provider:target.provider,engine:target.engine};
  });
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function tokenPayload(token: string) {
  const part = token.split(".")[1];
  if (!part) throw new Error("Malformed access token");
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);
  const apiKey = request.headers.get("apikey") || "";
  if (!apiKey || !publishableKeys.has(apiKey)) {
    return json({ error: { message: "Invalid API key" } }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_048_576) return json({ error: { message: "Request body is too large" } }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 1_048_576) return json({ error: { message: "Request body is too large" } }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: { message: "Invalid JSON body" } }, 400);
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }
  const requestedTarget = body.target === undefined ? "configured" : body.target;
  if (!["configured", "supabase", "neon"].includes(String(requestedTarget))) {
    return json({ error: { message: "Unsupported database target" } }, 400);
  }

  let role = "anon";
  let claims: Record<string, unknown> = { role };
  const authorization = request.headers.get("authorization") || "";
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return json({ error: { message: "Invalid authorization header" } }, 401);
    const token = match[1];
    const authClient = createClient(supabaseUrl, apiKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return json({ error: { message: "Invalid or expired session" } }, 401);
    claims = tokenPayload(token);
    if (claims.sub !== data.user.id) return json({ error: { message: "Session subject mismatch" } }, 401);
    role = "authenticated";
    claims.role = role;
  }

  let resolvingTarget = false;
  try {
    if(body.kind==="rpc"&&body.schema==="silver"&&body.name==="set_database_target"){
      if(!body.args||typeof body.args!=="object"||Array.isArray(body.args)||Object.keys(body.args).some(key=>key!=="p_target_id"))
        return json({error:{message:"Invalid database target activation"}},400);
      const targetId=(body.args as Record<string,unknown>).p_target_id;
      const result=await selectTargetAtomically(String(targetId||""),role,claims);
      return json({data:result,count:null});
    }
    const managesTargets=body.kind==="query"&&body.schema==="silver"&&body.table==="database_targets";
    let target=controlTarget as Record<string,any>;
    if(requestedTarget==="neon")target={provider:"neon",engine:"postgres",connection_alias:"neon_current",connection_mode:"direct"};
    if(requestedTarget==="configured"&&!managesTargets){
      resolvingTarget=true;
      const control=await databaseForTarget(controlTarget);
      const resolved=await control.transaction().execute(async trx=>{
        const rows=await trx.selectFrom("silver.database_targets")
          .select(["provider","engine","connection_alias","connection_mode","selected"])
          .where("selected","=",true).execute();
        const selected=selectedDatabaseTarget(rows);
        if(selected.provider==="supabase")
          return {target:selected,result:await executeRequest(trx,selected,role,claims,body)};
        return {target:selected};
      });
      resolvingTarget=false;
      target=resolved.target;
      if("result" in resolved){
        const result=resolved.result!;
        return json(result,200,result.count===null?{}:{"content-range":`0-${Math.max(0,(Array.isArray(result.data)?result.data.length:0)-1)}/${result.count}`});
      }
    }
    if(requestedTarget==="supabase")target=controlTarget;
    if(target.provider==="neon"&&(body.kind!=="query"||body.operation!=="select"))
      return json({error:{message:"Neon LOC mirror is read-only"}},403);
    if(target.provider==="neon"&&(body.schema!=="silver"||typeof body.table!=="string"||!neonLocReadTables.has(body.table)))
      return json({error:{message:"Neon LOC mirror table is not enabled"}},403);
    if(target.provider==="neon"&&role==="anon"){role="anonymous";claims.role=role;}
    if(target.engine!=="postgres"&&(body.kind!=="query"||body.operation!=="select"||body.schema!=="silver"||typeof body.table!=="string"||!neonLocReadTables.has(body.table)))
      return json({error:{message:"Cross-engine target is not authorized for this operation"}},403);
    const db=await databaseForTarget(target);
    const result=await db.transaction().execute(trx=>executeRequest(trx,target,role,claims,body));
    return json(result,200,result.count===null?{}:{"content-range":`0-${Math.max(0,(Array.isArray(result.data)?result.data.length:0)-1)}/${result.count}`});
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const transientConnectionFailure = code === "53300" || code.startsWith("08") || /connection (?:terminated|timeout)|remaining connection slots/i.test(message);
    const status = (error && typeof error === 'object' && 'httpStatus' in error) ? Number(error.httpStatus) : resolvingTarget || transientConnectionFailure ? 503 : isKyselyClientError(error) ? 400 : 500;
    if (status >= 500) console.error("[loc-kysely] Database request failed", error);
    const responseMessage = resolvingTarget ? "Selected database target is unavailable" : status === 503 ? "Database is temporarily unavailable" : status === 400 ? message : "Database request failed";
    return json({ error: { message: responseMessage, code: code || undefined } }, status);
  }
});
