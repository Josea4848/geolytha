import { create } from 'zustand';
import { events, getInterval } from '../domain/chronology';

/** Estado global: fonte única da verdade para funil, capa, globo e painéis. Espelhado na URL. */
type TimeState = {
  /** Intervalo em foco (id). */
  focusId: string;
  /** Idade de referência em Ma (meio do intervalo; usada pelo globo). */
  t: number;
  selectedEventId: string | null;
  /** Organismo selecionado (id do catálogo). Validado contra os dados quando estes carregam. */
  selectedTaxonId: string | null;
  focus: (id: string) => void;
  selectEvent: (id: string | null) => void;
  selectTaxon: (id: string | null) => void;
};

const DEFAULT_FOCUS = 'phanerozoic';
const mid = (id: string) => { const iv = getInterval(id)!; return (iv.start.ma + iv.end.ma) / 2; };
const validId = (s: string | null) => (s && /^[a-z0-9-]+$/.test(s) ? s : null);

function fromUrl(): Pick<TimeState, 'focusId' | 't' | 'selectedEventId' | 'selectedTaxonId'> {
  const p = new URLSearchParams(window.location.search);
  const f = p.get('foco');
  const focusId = f && getInterval(f) ? f : DEFAULT_FOCUS;
  const sel = p.get('sel');
  return {
    focusId,
    t: mid(focusId),
    selectedEventId: sel && events.some((e) => e.id === sel) ? sel : null,
    selectedTaxonId: validId(p.get('esp')),
  };
}

export const useTime = create<TimeState>((set) => ({
  ...fromUrl(),
  focus: (id) => { if (getInterval(id)) set({ focusId: id, t: mid(id) }); },
  selectEvent: (id) => set({ selectedEventId: id, ...(id ? { selectedTaxonId: null } : {}) }),
  selectTaxon: (id) => set({ selectedTaxonId: id, ...(id ? { selectedEventId: null } : {}) }),
}));

// URL ← estado (link compartilhável, sem poluir o histórico a cada passo)
let lastQs = '';
useTime.subscribe((s) => {
  const p = new URLSearchParams();
  p.set('foco', s.focusId);
  if (s.selectedEventId) p.set('sel', s.selectedEventId);
  if (s.selectedTaxonId) p.set('esp', s.selectedTaxonId);
  const qs = '?' + p.toString();
  if (qs === lastQs) return;
  window.history.replaceState(null, '', qs);
  lastQs = qs;
});
window.addEventListener('popstate', () => useTime.setState(fromUrl()));
