import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import pg from "npm:pg@8.16.3";
import { Kysely, PostgresDialect, sql } from "npm:kysely@0.29.6";
import { executeAllowlistedRpc, executeKyselyQuery, isKyselyClientError } from "../../../app/loc/providers/kysely-runtime.mjs";
import { adaptNeonThemeRequest, normalizeNeonThemeRows } from "../../../app/loc/providers/neon-theme-compat.mjs";
import { selectedDatabaseProvider } from "../../../app/loc/providers/selected-database-target.mjs";

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
const { Pool } = pg;
const databases = new Map<string, Kysely<Record<string, Record<string, unknown>>>>();
const neonLocReadTables = new Set([
  "game", "keyword_classes", "lo3rwang", "lo3rwang_blocks", "lo3rwang_galaxy",
  "lo3rwang_galaxy_media", "lo3rwang_keywords", "lo3rwang_time", "loc_blocks",
  "loc_search_keywords", "loc_theme", "lrunes", "lrunes_blocks", "lrunes_daily",
  "lrunes_galaxy", "lrunes_galaxy_media", "lrunes_time", "manage", "runes",
  "runes_etc", "runes_group", "scope_group_source_sharing", "scope_other_sources",
  "scope_registry", "scope_source_subcategories", "statistics_source_aliases",
  "statistics_source_categories",
]);

function database(target: string) {
  const envName = target === "neon" ? "NEON_DATABASE_URL" : "SUPABASE_DB_URL";
  let connectionString = Deno.env.get(envName);
  if (!connectionString && target === "supabase") connectionString = Deno.env.get("DATABASE_URL");
  if (!connectionString) throw new Error(`${envName} is not configured`);
  let db = databases.get(target);
  if (!db) {
    const pool = new Pool({ connectionString, max: 1, idleTimeoutMillis: 1_000, connectionTimeoutMillis: 5_000 });
    db = new Kysely({ dialect: new PostgresDialect({ pool }) });
    databases.set(target, db);
  }
  return db;
}

async function executeRequest(trx: any, target: string, role: string, claims: Record<string, unknown>, body: Record<string, unknown>) {
  if (role === "authenticated") await sql`set local role authenticated`.execute(trx);
  else if (target === "neon") await sql`set local role anonymous`.execute(trx);
  else await sql`set local role anon`.execute(trx);
  await sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`.execute(trx);
  await sql`select set_config('request.jwt.claim.sub', ${String(claims.sub || "")}, true)`.execute(trx);
  await sql`select set_config('request.jwt.claim.role', ${role}, true)`.execute(trx);
  if (body.kind === "query") {
    const theme = target === "neon" ? adaptNeonThemeRequest(body) : null;
    const result = await executeKyselyQuery(trx, theme?.request || body);
    if (theme) result.data = normalizeNeonThemeRows(result.data, theme.columns);
    return result;
  }
  return await executeAllowlistedRpc(trx, body);
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

  let target: string;
  let resolvingTarget = false;
  try {
    const managesTargets = body.kind === "query" && body.schema === "silver" && body.table === "database_targets";
    target = requestedTarget === "configured"
      ? "supabase"
      : String(requestedTarget);
    if (requestedTarget === "configured" && !managesTargets) {
      // Read the saved target before setting caller claims, then execute the
      // Supabase path in that same transaction/connection. A target change is
      // observed on the next request without doubling PostgreSQL connections.
      resolvingTarget = true;
      const resolved = await database("supabase").transaction().execute(async (trx) => {
        const rows = await trx.selectFrom("silver.database_targets")
          .select("provider").where("selected", "=", true).execute();
        const selected = selectedDatabaseProvider(rows);
        if (selected === "supabase") return { target: selected, result: await executeRequest(trx, selected, role, claims, body) };
        return { target: selected };
      });
      resolvingTarget = false;
      target = resolved.target;
      if ("result" in resolved) {
        const result = resolved.result;
        return json(result, 200, result.count === null ? {} : { "content-range": `0-${Math.max(0, (Array.isArray(result.data) ? result.data.length : 0) - 1)}/${result.count}` });
      }
    }

    if (target === "neon" && (body.kind !== "query" || body.operation !== "select")) {
      return json({ error: { message: "Neon LOC mirror is read-only" } }, 403);
    }
    if (target === "neon" && (body.schema !== "silver" || typeof body.table !== "string" || !neonLocReadTables.has(body.table))) {
      return json({ error: { message: "Neon LOC mirror table is not enabled" } }, 403);
    }
    if (target === "neon" && role === "anon") {
      role = "anonymous";
      claims.role = role;
    }

    const result = await database(target).transaction().execute((trx) => executeRequest(trx, target, role, claims, body));
    return json(result, 200, result.count === null ? {} : { "content-range": `0-${Math.max(0, (Array.isArray(result.data) ? result.data.length : 0) - 1)}/${result.count}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const transientConnectionFailure = code === "53300" || code.startsWith("08") || /connection (?:terminated|timeout)|remaining connection slots/i.test(message);
    const status = resolvingTarget || transientConnectionFailure ? 503 : isKyselyClientError(error) ? 400 : 500;
    if (status >= 500) console.error("[loc-kysely] Database request failed", error);
    const responseMessage = resolvingTarget ? "Selected database target is unavailable" : status === 503 ? "Database is temporarily unavailable" : status === 400 ? message : "Database request failed";
    return json({ error: { message: responseMessage, code: code || undefined } }, status);
  }
});
