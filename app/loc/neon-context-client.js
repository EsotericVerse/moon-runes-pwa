import {z} from 'zod';

const ContextRowSchema=z.object({
  context_key:z.string(),
  context_type:z.string().nullable().optional(),
  title:z.string().nullable().optional(),
  summary:z.string().nullable().optional(),
  payload:z.unknown().nullable().optional()
});
const ContextResponseSchema=z.object({rows:z.array(ContextRowSchema)});

export async function selectScopeContextRows(scopeId){
  const response=await fetch(`/api/context?scopeId=${encodeURIComponent(String(scopeId||''))}`,{
    cache:'no-store',
    headers:{accept:'application/json'}
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||`脈絡讀取失敗（${response.status}）`);
  return ContextResponseSchema.parse(payload).rows;
}
