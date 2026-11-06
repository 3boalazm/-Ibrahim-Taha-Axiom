/**
 * Knowledge-graph layout from verified manifest relationships only.
 *
 * Three columns: research areas and methods (start side) · publications
 * (centre) · projects, talks and the dataset (end side). Publications are
 * ordered by the barycentre of their start-side links, which keeps edges
 * short and reduces crossings. Geometry is expressed in viewBox units that
 * match the CSS grid of KnowledgeGraph.astro (see COLUMN constants there).
 * Nothing is inferred from keywords: no relationship, no edge.
 */
import { datasets, methods, pick, projects, researchAreas, talks } from './content';
import { publications } from './publications';
import { relations, refKey, type NodeRef, type Relation } from './relations';
import type { Lang } from './schema';

export type Side = 'start' | 'centre' | 'end';
export interface GraphNode {
  ref: string;
  kind: NodeRef['kind'];
  id: string;
  side: Side;
  label: string;
  /** Language of the label when it differs from the page language. */
  labelLang?: Lang;
  draft?: boolean;
  year?: number | null;
  href: string;
  /** Row index within its column. */
  row: number;
}
export interface GraphEdge {
  from: string;
  to: string;
  evidence: string;
  source?: { field: string; quote: string };
  /** Path in viewBox units; null for links drawn only in the panel/list. */
  d: string | null;
}

/** Horizontal geometry in viewBox units (width 1000), mirrored by CSS in RTL. */
export const GEOMETRY = {
  width: 1000,
  rowUnit: 100,
  /** start column: 0–317, centre: 317–683, end: 683–1000 (grid 1fr 1.15fr 1fr) */
  startEdge: 292,
  centreIn: 368,
  centreOut: 632,
  endEdge: 708,
};

export function buildGraph(lang: Lang, paths: { research: string; projects: string; talks: string; pub: (key: string) => string }) {
  const nodes: GraphNode[] = [];
  const add = (n: Omit<GraphNode, 'row'>) => nodes.push({ ...n, row: 0 });
  const label = (v: Parameters<typeof pick>[0]) => {
    const r = pick(v, lang);
    return { label: r?.text ?? '', labelLang: r && r.lang !== lang ? r.lang : undefined, draft: r?.draft || undefined };
  };

  for (const a of researchAreas) add({ ref: `area:${a.id}`, kind: 'area', id: a.id, side: 'start', ...label(a.title), href: `${paths.research}#${a.id}` });
  for (const m of methods)
    add({ ref: `method:${m.id}`, kind: 'method', id: m.id, side: 'start', ...label(m.title), href: `${paths.research}?focus=method:${m.id}#knowledge-graph` });
  for (const p of publications)
    add({ ref: `publication:${p.key}`, kind: 'publication', id: p.key, side: 'centre', label: p.title, labelLang: p.titleLang && p.titleLang !== lang ? p.titleLang : undefined, year: p.year, href: paths.pub(p.key) });
  for (const pr of projects) add({ ref: `project:${pr.id}`, kind: 'project', id: pr.id, side: 'end', ...label(pr.title), href: `${paths.projects}#${pr.id}` });
  for (const tk of talks) add({ ref: `talk:${tk.id}`, kind: 'talk', id: tk.id, side: 'end', ...label(tk.title), href: `${paths.talks}#${tk.id}` });
  for (const d of datasets) add({ ref: `dataset:${d.id}`, kind: 'dataset', id: d.id, side: 'end', ...label(d.title), href: d.url });

  const byRef = new Map(nodes.map((n) => [n.ref, n]));
  const col = (side: Side) => nodes.filter((n) => n.side === side);
  col('start').forEach((n, i) => (n.row = i));
  col('end').forEach((n, i) => (n.row = i));

  // Barycentric order for publications (start-side links first, then end side, then year).
  const centre = col('centre');
  const nStart = col('start').length;
  const bary = (n: GraphNode) => {
    const rows = relations
      .filter((r) => refKey(r.from) === n.ref || refKey(r.to) === n.ref)
      .map((r) => byRef.get(refKey(r.from) === n.ref ? refKey(r.to) : refKey(r.from)))
      .filter((m): m is GraphNode => !!m && m.side === 'start')
      .map((m) => m.row);
    return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : nStart + 1;
  };
  centre
    .map((n) => ({ n, b: bary(n) }))
    .sort((x, y) => x.b - y.b || (y.n.year ?? 0) - (x.n.year ?? 0) || x.n.label.localeCompare(y.n.label))
    .forEach(({ n }, i) => (n.row = i));

  const rows = { start: nStart, centre: centre.length, end: col('end').length };
  const height = rows.centre * GEOMETRY.rowUnit;
  const yOf = (n: GraphNode) => ((n.row + 0.5) * height) / rows[n.side];
  const G = GEOMETRY;
  const edgePath = (a: GraphNode, b: GraphNode): string | null => {
    const [p, q] = a.side === 'centre' ? [b, a] : [a, b];
    if (q.side !== 'centre' || p.side === 'centre') return null;
    if (p.side === 'start') {
      const y1 = yOf(p);
      const y2 = yOf(q);
      const mx = (G.startEdge + G.centreIn) / 2;
      return `M${G.startEdge} ${y1.toFixed(1)}C${mx} ${y1.toFixed(1)} ${mx} ${y2.toFixed(1)} ${G.centreIn} ${y2.toFixed(1)}`;
    }
    const y1 = yOf(q);
    const y2 = yOf(p);
    const mx = (G.centreOut + G.endEdge) / 2;
    return `M${G.centreOut} ${y1.toFixed(1)}C${mx} ${y1.toFixed(1)} ${mx} ${y2.toFixed(1)} ${G.endEdge} ${y2.toFixed(1)}`;
  };

  const edges: GraphEdge[] = relations.map((r: Relation) => {
    const a = byRef.get(refKey(r.from))!;
    const b = byRef.get(refKey(r.to))!;
    return { from: a.ref, to: b.ref, evidence: r.evidence, source: r.source, d: edgePath(a, b) };
  });

  return { nodes: nodes.sort((x, y) => (x.side === y.side ? x.row - y.row : 0)), edges, rows, height };
}
