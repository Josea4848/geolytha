import { useEffect, useMemo, useRef, useState } from 'react';
import { deepestAt, events, extinctionLabel, extinctionWord, formatAge, formatMa, intervals, RANK_LABEL } from '../domain/chronology';
import { GROUP_LABEL, span, typicalAge } from '../domain/taxa';
import { useTime } from '../state/store';
import { useTaxa } from './Species';

type Hit = { key: string; kind: string; label: string; detail: string; go: () => void; text: string };
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[-–—]/g, '-').toLowerCase();

/** Busca global (Ctrl+K ou "/"): intervalos, marcos, extinções e organismos. */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { focus, selectEvent, selectTaxon } = useTime();
  const { data: taxa } = useTaxa();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const all = useMemo<Hit[]>(() => {
    const done = (fn: () => void) => () => { fn(); setOpen(false); };
    const hits: Hit[] = intervals.map((i) => ({
      key: i.id, kind: RANK_LABEL[i.rank], label: i.name.pt, detail: `${formatAge(i.start)} – ${formatAge(i.end)}`,
      text: norm(`${i.name.pt} ${i.name.en}`), go: done(() => focus(i.id)),
    }));
    for (const e of events) {
      hits.push({
        key: e.id, kind: e.type === 'mass_extinction' ? 'Extinção' : 'Marco', label: e.abbr ? `${e.name.pt} (${e.abbr[0]})` : e.name.pt,
        detail: `${extinctionLabel(e.id) ? extinctionLabel(e.id) + ' · ' : ''}${formatAge(e.time.start)}`,
        text: norm(`${e.name.pt} ${e.name.en} ${(e.abbr ?? []).map((a) => `${a} ${a.replace(/[-–—]/g, '')}`).join(' ')} ${extinctionLabel(e.id) ?? ''} ${extinctionWord(e.id)} grande extincao`),
        go: done(() => { const iv = deepestAt(e.time.start.ma); if (iv) focus(iv.id); selectEvent(e.id); }),
      });
    }
    for (const t of taxa?.taxa ?? []) {
      const [o, y] = span(t);
      hits.push({
        key: t.id, kind: GROUP_LABEL[t.group], label: t.name, detail: `${t.commonName ? t.commonName + ' · ' : ''}${formatMa(o)} → ${t.extant ? 'presente' : formatMa(y)}`,
        text: norm(`${t.name} ${t.commonName ?? ''} ${t.classification.family ?? ''}`),
        go: done(() => { const iv = deepestAt(typicalAge(t)); if (iv) focus(iv.id); selectTaxon(t.id); }),
      });
    }
    return hits;
  }, [taxa, focus, selectEvent, selectTaxon]);

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    return all
      .filter((h) => h.text.includes(n))
      .sort((a, b) => Number(!a.text.startsWith(n)) - Number(!b.text.startsWith(n)))
      .slice(0, 12);
  }, [q, all]);

  if (!open) {
    return (
      <button className="search-btn" onClick={() => setOpen(true)} aria-label="Buscar (Ctrl+K)">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <span>Buscar</span><kbd>Ctrl K</kbd>
      </button>
    );
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && results[idx]) results[idx].go();
  };

  return (
    <div className="search-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="search-box" role="dialog" aria-label="Buscar no atlas" onKeyDown={onKey}>
        <input ref={inputRef} type="search" value={q} placeholder="Período, extinção, marco ou organismo…"
          onChange={(e) => { setQ(e.target.value); setIdx(0); }} aria-label="Buscar no atlas"
          role="combobox" aria-expanded={results.length > 0} aria-controls="search-results" aria-activedescendant={results[idx] ? `sr-${results[idx].key}` : undefined} />
        <ul id="search-results" role="listbox">
          {results.map((h, i) => (
            <li key={h.kind + h.key} id={`sr-${h.key}`} role="option" aria-selected={i === idx}
              className={i === idx ? 'on' : ''} onMouseEnter={() => setIdx(i)} onClick={h.go}>
              <span className="sr-kind">{h.kind}</span>
              <span className="sr-label">{h.label}</span>
              <span className="sr-detail">{h.detail}</span>
            </li>
          ))}
          {q && results.length === 0 && <li className="sr-empty">Nada encontrado para "{q}".</li>}
        </ul>
        <p className="small muted sr-hint">↑ ↓ para navegar · Enter para abrir · Esc para fechar</p>
      </div>
    </div>
  );
}
