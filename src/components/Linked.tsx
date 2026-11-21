import { useMemo, type ReactNode } from 'react';
import { deepestAt, events, intervals } from '../domain/chronology';
import { typicalAge } from '../domain/taxa';
import { useTime } from '../state/store';
import { useTaxa } from './Species';

type Target = { kind: 'interval' | 'event' | 'taxon'; id: string; title: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// traços (-, –, —) equivalem entre si
const pat = (s: string) => esc(s).replace(/[-–—]/g, '[-–—]');

/**
 * Texto com atalhos: menções a intervalos, eventos (inclusive siglas como K–Pg) e organismos
 * do atlas viram links que levam até eles.
 */
export function Linked({ text, self }: { text: string; self?: string }) {
  const { focus, selectEvent, selectTaxon } = useTime();
  const { data } = useTaxa();

  const { re, map } = useMemo(() => {
    const map = new Map<string, Target>();
    const add = (term: string, t: Target) => { if (term.length > 2) map.set(term.toLowerCase().replace(/[-—]/g, '–'), t); };
    for (const i of intervals) add(i.name.pt, { kind: 'interval', id: i.id, title: i.name.pt });
    for (const e of events) {
      add(e.name.pt, { kind: 'event', id: e.id, title: e.name.pt });
      for (const a of e.abbr ?? []) add(a, { kind: 'event', id: e.id, title: e.name.pt });
    }
    for (const t of data?.taxa ?? []) add(t.name, { kind: 'taxon', id: t.id, title: t.name });
    const terms = [...map.keys()].sort((a, b) => b.length - a.length);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${terms.map(pat).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
    return { re, map };
  }, [data]);

  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const t = map.get(m[0].toLowerCase().replace(/[-—]/g, '–'));
    if (!t || t.id === self) continue;
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const go = () => {
      if (t.kind === 'interval') focus(t.id);
      else if (t.kind === 'event') {
        const e = events.find((x) => x.id === t.id)!;
        const iv = deepestAt(e.time.start.ma); if (iv) focus(iv.id);
        selectEvent(t.id);
      } else {
        const tx = data!.taxa.find((x) => x.id === t.id)!;
        const iv = deepestAt(typicalAge(tx)); if (iv) focus(iv.id);
        selectTaxon(t.id);
      }
    };
    const label = t.kind === 'taxon' ? <i>{m[0]}</i> : m[0];
    parts.push(<button key={m.index} type="button" className="xref" onClick={go} title={`Ir para ${t.title}`}>{label}</button>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
