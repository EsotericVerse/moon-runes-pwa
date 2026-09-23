import {z} from 'zod';

// Stable feature contracts. Database table names and split layout stay behind
// the Neon client modules, so a Neon table migration does not require UI rewrites.
const OpenRowSchema=z.object({}).passthrough();
const ContextNodeSchema=z.object({
  node_id:z.string().trim().min(1),
  label:z.string().trim().min(1).optional(),
  node_type:z.string().optional(),
  scope_id:z.string().optional(),
  description:z.string().optional()
}).passthrough();
const ContextEdgeSchema=z.object({
  edge_id:z.string().trim().min(1),
  source_node_id:z.string().trim().min(1),
  target_node_id:z.string().trim().min(1),
  relation_type:z.string().trim().min(1),
  relation_label:z.string().optional(),
  description:z.string().optional(),
  evidence:z.string().optional(),
  date:z.string().optional()
}).passthrough();

export const ScopeContextResponseSchema=z.object({
  rows:z.array(OpenRowSchema).default([]),
  nodes:z.array(ContextNodeSchema).default([]),
  edges:z.array(ContextEdgeSchema).default([]),
  trends:z.array(OpenRowSchema).default([])
}).passthrough();

export const ScopeCultureResponseSchema=z.object({
  scopeId:z.enum(['loc','runes','lo3rwang']),
  eras:z.object({eras:z.array(OpenRowSchema).default([])}).default({eras:[]}),
  authorEras:z.object({eras:z.array(OpenRowSchema).default([])}).optional(),
  runeEras:z.object({eras:z.array(OpenRowSchema).default([])}).default({eras:[]}),
  runeHistory:z.record(z.string(),z.unknown()).default({}),
  periods:z.array(OpenRowSchema).default([]),
  events:z.array(OpenRowSchema).default([]),
  trajectories:z.array(OpenRowSchema).default([]),
  works:z.array(OpenRowSchema).default([]),
  authorKeywords:z.object({keywords:z.array(OpenRowSchema).default([])}).default({keywords:[]}),
  musicPeriods:z.record(z.string(),z.unknown()).default({periods:[]}),
  writingPeriods:z.record(z.string(),z.unknown()).default({periods:[]})
}).passthrough();

export const ScopeRankingResponseSchema=z.object({
  rows:z.array(z.object({
    ranking_type:z.string(),
    term:z.string(),
    item_count:z.coerce.number(),
    rank_value:z.coerce.number(),
    ranking_key:z.string()
  }).passthrough()),
  count:z.coerce.number().int().nonnegative(),
  page:z.coerce.number().int().positive(),
  pageSize:z.coerce.number().int().positive(),
  types:z.array(z.string())
}).passthrough();
