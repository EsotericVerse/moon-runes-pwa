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

export async function upsertScopeWorkAffiliation(value){
  const body=BodySchema.parse(value);
  const overrideAction=body.overrideAction||(body.statisticsIncluded?'include':'exclude');
  const [row]=await upsertNeonRows('silver.work_scope_affiliations',[{
    work_id:body.workId,
    scope_id:body.scopeId,
    relation_type:body.relationType,
    affiliation_source:'manual',
    rule_key:null,
    display_label:body.displayLabel,
    search_included:body.searchIncluded,
    statistics_included:body.statisticsIncluded,
    manual_override:true,
    override_action:overrideAction,
    note:body.note,
    updated_at:new Date().toISOString()
  }],{
    conflict:'work_id,scope_id',
    returning:'work_id,scope_id,relation_type,search_included,statistics_included,manual_override,override_action,display_label,note,updated_at'
  });
  if(!row)throw new Error('找不到可連結的 canonical work_id，或目前帳號沒有寫入權限');
  return row;
}
