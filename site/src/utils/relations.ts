/**
 * Verified relationships between approved records.
 *
 * The manifest lists every link the site may draw (publication → area, project,
 * talk, method, dataset; project → dataset). This module checks them at build
 * time and fails the build when:
 *   - either end does not exist in the approved data,
 *   - a link is duplicated or points at itself,
 *   - a link carries a `source` quote that is not found verbatim in the cited
 *     field of the source record (title, keywords, abstract, supp or links).
 * Nothing here infers a relationship from keywords; it only reads the manifest.
 */
import { courses, datasets, manifest, methods, openIssues, projects, researchAreas, talks } from './content';
import { getPublication, publications, type Publication } from './publications';
import { NODE_KINDS, type NodeKind } from './schema';

export interface NodeRef {
  kind: NodeKind;
  id: string;
}
export interface Relation {
  from: NodeRef;
  to: NodeRef;
  evidence: string;
  source?: { field: string; quote: string };
}

export function parseRef(ref: string): NodeRef {
  const i = ref.indexOf(':');
  return { kind: ref.slice(0, i) as NodeKind, id: ref.slice(i + 1) };
}
export const refKey = (r: NodeRef) => `${r.kind}:${r.id}`;

const ids: Record<NodeKind, Set<string>> = {
  publication: new Set(publications.map((p) => p.key)),
  area: new Set(researchAreas.map((a) => a.id)),
  project: new Set(projects.map((p) => p.id)),
  course: new Set(courses.map((c) => c.id)),
  talk: new Set(talks.map((t) => t.id)),
  method: new Set(methods.map((m) => m.id)),
  dataset: new Set(datasets.map((d) => d.id)),
};
export const nodeExists = (r: NodeRef) => NODE_KINDS.includes(r.kind) && ids[r.kind].has(r.id);

function quoteFound(rel: Relation): boolean {
  if (!rel.source) return true;
  const { field, quote } = rel.source;
  if (rel.from.kind === 'publication') {
    const p = getPublication(rel.from.id) as Publication;
    if (field === 'title') return p.title.includes(quote);
    if (field === 'abstract') return (p.abstract ?? '').includes(quote);
    if (field === 'keywords') return p.keywords.some((k) => k.includes(quote));
    if (field === 'supp') return p.links.some((l) => l.kind === 'supp' && l.href.includes(quote));
    if (field === 'links') return p.links.some((l) => l.href.includes(quote)) || (p.doi ?? '').includes(quote);
    return false;
  }
  if (rel.from.kind === 'project') {
    const pr = projects.find((x) => x.id === rel.from.id);
    if (!pr) return false;
    if (field === 'title') return [pr.title.en, pr.title.ar].some((t) => t?.includes(quote));
    if (field === 'links') return pr.links.some((l) => l.url.includes(quote) || [l.label.en, l.label.ar].some((t) => t?.includes(quote)));
    return false;
  }
  return false;
}

export const relations: Relation[] = manifest.relationships.map((r) => ({
  from: parseRef(r.from),
  to: parseRef(r.to),
  evidence: r.evidence,
  source: r.source,
}));

{
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const r of relations) {
    const key = `${refKey(r.from)} -> ${refKey(r.to)}`;
    if (!nodeExists(r.from)) problems.push(`${key}: unknown source ${refKey(r.from)}`);
    if (!nodeExists(r.to)) problems.push(`${key}: unknown target ${refKey(r.to)}`);
    if (refKey(r.from) === refKey(r.to)) problems.push(`${key}: links a record to itself`);
    if (seen.has(key)) problems.push(`${key}: duplicated`);
    seen.add(key);
    if (nodeExists(r.from) && !quoteFound(r)) problems.push(`${key}: quote "${r.source?.quote}" not found in ${r.source?.field}`);
  }
  for (const issue of openIssues.issues) {
    for (const s of issue.subjects) {
      const ref = parseRef(s);
      if (NODE_KINDS.includes(ref.kind) && !nodeExists(ref)) problems.push(`open issue ${issue.id}: unknown subject ${s}`);
    }
  }
  if (problems.length) throw new Error(`[relationships] manifest relationships are invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
}

/** Records linked to `node` (either direction), optionally of one kind. */
export function linked(node: NodeRef, kind?: NodeKind): { node: NodeRef; relation: Relation }[] {
  const k = refKey(node);
  const out: { node: NodeRef; relation: Relation }[] = [];
  for (const r of relations) {
    if (refKey(r.from) === k && (!kind || r.to.kind === kind)) out.push({ node: r.to, relation: r });
    else if (refKey(r.to) === k && (!kind || r.from.kind === kind)) out.push({ node: r.from, relation: r });
  }
  return out;
}

export const areasOf = (pubKey: string) => linked({ kind: 'publication', id: pubKey }, 'area').map((x) => x.node.id);
export const projectsOf = (pubKey: string) => linked({ kind: 'publication', id: pubKey }, 'project').map((x) => x.node.id);
export const methodsOf = (pubKey: string) => linked({ kind: 'publication', id: pubKey }, 'method').map((x) => x.node.id);
export const publicationsOfArea = (areaId: string) => linked({ kind: 'area', id: areaId }, 'publication').map((x) => x.node.id);
export const publicationsOfProject = (projectId: string) => linked({ kind: 'project', id: projectId }, 'publication').map((x) => x.node.id);
export const publicationsOfTalk = (talkId: string) => linked({ kind: 'talk', id: talkId }, 'publication').map((x) => x.node.id);
