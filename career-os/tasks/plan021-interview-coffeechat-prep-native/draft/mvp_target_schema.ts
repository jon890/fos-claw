import { z } from 'zod';
import { readFileSync } from 'fs';

export const CoffeechatSiteSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  label: z.string(),
});

export const CoffeechatSchema = z.object({
  sites: z.array(CoffeechatSiteSchema),
  source_dir: z.string(),
  report_slug: z.string(),
  prep_dir: z.string(),
  strategy_filename: z.string().default('strategy.md'),
  checklist_filename: z.string().default('checklist.md'),
});

export const MvpTargetPrimarySchema = z.object({
  company: z.string(),
  team: z.string(),
  role: z.string(),
  interview_date: z.string(),
  notes: z.string().optional(),
  coffeechat: CoffeechatSchema.optional(),
});

export const MvpTargetHistoryItemSchema = z.object({
  company: z.string(),
  team: z.string(),
  role: z.string(),
  interview_date: z.string(),
  deprecated_at: z.string(),
  notes: z.string().optional(),
});

export const MvpTargetSchema = z.object({
  primary: MvpTargetPrimarySchema,
  history: z.array(MvpTargetHistoryItemSchema).default([]),
});

export type MvpTarget = z.infer<typeof MvpTargetSchema>;
export type CoffeechatConfig = z.infer<typeof CoffeechatSchema>;
export type CoffeechatSite = z.infer<typeof CoffeechatSiteSchema>;

export function parseMvpTarget(path: string): MvpTarget {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return MvpTargetSchema.parse(raw);
}
