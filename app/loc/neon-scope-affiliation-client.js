'use client';

import {z} from 'zod';

const BodySchema=z.object({
  workId:z.string().trim().min(1).max(80),
  scopeId:z.enum(['loc','runes','lo3rwang']),
  relationType:z.enum(['primary','secondary']).default('secondary'),
  searchIncluded:z.boolean().default(true),
  statisticsIncluded:z.boolean().default(true),
  displayLabel:z.string().trim().max(240).default(''),
  note:z.string().trim().max(2000).default(''),
  overrideAction:z.enum(['include','exclude','review','replace_relation']).nullable().default(null)
});

export async function upsertScopeWorkAffiliation(value,accessToken){
  const body=BodySchema.parse(value);
  const response=await fetch('/api/scope/affiliations',{
    method:'POST',
    headers:{
      'content-type':'application/json',
      ...(accessToken?{authorization:`Bearer ${accessToken}`}:{})
    },
    body:JSON.stringify(body)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||`Scope 連結寫入失敗（${response.status}）`);
  return payload.row;
}
