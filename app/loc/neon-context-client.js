'use client';

import {z} from 'zod';
import {selectNeonRows} from './neon-repository';

const ContextRowSchema=z.object({
  context_key:z.string(),
  context_type:z.string().nullable().optional(),
  title:z.string().nullable().optional(),
  summary:z.string().nullable().optional(),
  payload:z.unknown().nullable().optional()
});
const ContextResponseSchema=z.array(ContextRowSchema);
const CONTEXT_VIEWS=Object.freeze({
  loc:'api.loc_context_entries',
  runes:'api.runes_context_entries',
  lo3rwang:'api.lo3rwang_context_entries'
});

export async function selectScopeContextRows(scopeId){
  const table=CONTEXT_VIEWS[String(scopeId||'')];
  if(!table)throw new Error('Scope 無效');
  const {rows}=await selectNeonRows(table,{
    columns:'context_key,context_type,title,summary,payload',
    orders:[{column:'context_key',ascending:true}],
    limit:5000
  });
  return ContextResponseSchema.parse(rows);
}
