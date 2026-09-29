import {z} from 'zod';

// Stable Current feature contracts. Database table names and split layout stay behind
// domain clients, so a Neon table migration does not require UI rewrites.
const OpenRowSchema=z.object({}).passthrough();

export const ScopeCultureResponseSchema=z.object({
  scopeId:z.string().min(1),
  eras:z.object({eras:z.array(OpenRowSchema).default([])}).default({eras:[]}),
  periods:z.array(OpenRowSchema).default([]),
  openRanges:z.array(OpenRowSchema).default([]),
  scopeRanges:z.array(OpenRowSchema).default([]),
  timelineItems:z.array(OpenRowSchema).default([]),
  events:z.array(OpenRowSchema).default([]),
  trajectories:z.array(OpenRowSchema).default([]),
  works:z.array(OpenRowSchema).default([])
}).passthrough();

export const ScopeRankingResponseSchema=z.object({
  rows:z.array(z.object({
    ranking_type:z.string(),
    term:z.string(),
    item_count:z.coerce.number(),
    rank_value:z.coerce.number(),
    ranking_key:z.string(),
    source_updated_at:z.string().nullable().optional(),
    calculated_at:z.string().nullable().optional()
  }).passthrough()),
  offset:z.coerce.number().int().nonnegative(),
  limit:z.coerce.number().int().positive(),
  hasMore:z.boolean(),
  types:z.array(z.string())
}).passthrough();
