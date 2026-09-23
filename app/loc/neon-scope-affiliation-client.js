'use client';

import {z} from 'zod';
import {upsertNeonRows} from './neon-repository';

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
  void accessToken;
  const override=Boolean(body.overrideAction);
  const rows=await upsertNeonRows('silver.work_scope_affiliations',[{
    work_id:body.workId,
    scope_id:body.scopeId,
    relation_type:body.relationType,
    affiliation_source:override?'override':'manual',
    display_label:body.displayLabel||null,
    search_included:body.searchIncluded,
    statistics_included:body.statisticsIncluded,
    manual_override:override,
    override_action:body.overrideAction,
    note:body.note||null,
    updated_at:new Date().toISOString()
  }],{conflict:'work_id,scope_id'});
  return rows[0]||null;
}
