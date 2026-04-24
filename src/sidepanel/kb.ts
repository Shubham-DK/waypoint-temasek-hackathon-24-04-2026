import type { KBDocument } from '../types/actions';

export function kbContextFor(query: string, kbDocuments: KBDocument[]): string {
  if (!kbDocuments.length) return '';

  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = kbDocuments.map(doc => {
    const docText = `${doc.name} ${doc.content}`.toLowerCase();
    const score = queryWords.filter(w => docText.includes(w)).length;
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 2).filter(s => s.score > 0);

  if (!top.length) return '';

  return top
    .map(s => `--- ${s.doc.name} ---\n${s.doc.content}`)
    .join('\n\n');
}
