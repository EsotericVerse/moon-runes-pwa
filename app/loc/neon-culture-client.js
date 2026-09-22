'use client';

import {z} from 'zod';

const RowSchema=z.object({}).passthrough();
const CultureSchema=z.object({
  scopeId:z.enum(['loc','runes','lo3rwang']),
  eras:z.array(RowSchema).default([]),
  authorEras:z.object({eras:z.array(RowSchema).default([])}).optional(),
  runeEras:z.object({eras:z.array(RowSchema).default([])}).default({eras:[]}),
  runeHistory:z.record(z.string(),z.unknown()).default({}),
  periods:z.array(RowSchema).default([]),
  authorKeywords:z.object({keywords:z.array(RowSchema).default([])}).default({keywords:[]}),
  musicPeriods:z.record(z.string(),z.unknown()).default({periods:[]}),
  writingPeriods:z.record(z.string(),z.unknown()).default({periods:[]})
});

export async function selectScopeCultureData(scopeId){
  const response=await fetch(`/api/culture?scopeId=${encodeURIComponent(scopeId)}`,{cache:'no-store'});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||`文化 Neon 讀取失敗（${response.status}）`);
  return CultureSchema.parse(payload);
}
