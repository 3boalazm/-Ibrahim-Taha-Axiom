/**
 * Source-labelled research metrics.
 *
 * Figures are never computed or guessed here: they are copied from the approved
 * snapshot in src/data/approved/research-metrics.json, which records the
 * platform, its URL and the retrieval date for every number. The site always
 * prints the source next to the figure, because platform counts differ
 * (ResearchGate counts uploads, OpenAlex counts indexed works) and none of them
 * is an institutional metric.
 */
import raw from '../data/approved/research-metrics.json';
import { z } from 'astro/zod';

const Snapshot = z.object({
  source: z.string(),
  sourceLabel: z.string(),
  url: z.string().url(),
  retrieved: z.string(),
  scope: z.string(),
  figures: z.object({ works: z.number(), citations: z.number(), hIndex: z.number(), i10Index: z.number() }),
  secondary: z.array(
    z.object({
      source: z.string(),
      url: z.string().url(),
      retrieved: z.string(),
      figures: z.object({ publications: z.number(), reads: z.number(), citations: z.number() }),
    }),
  ),
  note: z.string(),
});

const parsed = Snapshot.safeParse(raw);
if (!parsed.success) {
  throw new Error(`[metrics] approved/research-metrics.json is invalid:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
}

export const metrics = parsed.data;
export const primaryMetrics = metrics.figures;
export const secondaryMetrics = metrics.secondary[0];
