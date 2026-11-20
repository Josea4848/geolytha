import intervalsRaw from '../data/chronology/intervals.json';
import metaRaw from '../data/chronology/meta.json';
import eventsRaw from '../data/events/events.json';
import referencesRaw from '../data/references/references.json';
import type { Age, ChronoMeta, GeoEvent, Interval, Rank, Reference } from './schema';
import { RANKS } from './schema';

// Os dados já são validados no build (npm run validate); aqui apenas tipamos.
export const intervals = intervalsRaw as Interval[];
export const chronoMeta = metaRaw as ChronoMeta;
export const events = eventsRaw as GeoEvent[];
export const references = referencesRaw as Reference[];

const byId = new Map(intervals.map((i) => [i.id, i]));
const refById = new Map(references.map((r) => [r.id, r]));

export const EARTH_START = Math.max(...intervals.map((i) => i.start.ma));

export const getInterval = (id: string) => byId.get(id);
export const getReference = (id: string) => refById.get(id);
export const duration = (i: Interval) => i.start.ma - i.end.ma;

/** Ordenado do mais antigo para o mais recente. */
const chrono = (a: Interval, b: Interval) => b.start.ma - a.start.ma;

export const byRank = (rank: Rank) => intervals.filter((i) => i.rank === rank).sort(chrono);
export const childrenOf = (id: string) => intervals.filter((i) => i.parentId === id).sort(chrono);

export function ancestors(id: string): Interval[] {
  const out: Interval[] = [];
  let cur = byId.get(id);
  while (cur?.parentId) {
    cur = byId.get(cur.parentId);
    if (cur) out.unshift(cur);
  }
  return out;
}

/** Intervalo de um nível que contém a idade t (limite inferior inclusivo). */
export function intervalAt(t: number, rank: Rank): Interval | undefined {
  return byRank(rank).find((i) => t <= i.start.ma && t > i.end.ma) ?? (t === 0 ? byRank(rank).slice(-1)[0] : undefined);
}

/** Intervalo mais detalhado existente na idade t. */
export function deepestAt(t: number): Interval | undefined {
  for (let k = RANKS.length - 1; k >= 0; k--) {
    const iv = intervalAt(t, RANKS[k]);
    if (iv) return iv;
  }
}

/** Mesmo nível, vizinho cronológico (dir = +1 → mais recente). */
export function neighbor(id: string, dir: 1 | -1): Interval | undefined {
  const iv = byId.get(id);
  if (!iv) return;
  const list = byRank(iv.rank);
  return list[list.indexOf(iv) + dir];
}

export const eventsWithin = (start: number, end: number) =>
  events.filter((e) => e.time.start.ma >= end && (e.time.end?.ma ?? e.time.start.ma) <= start);

// ---------- Formatação ----------
const nf = (digits: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits });

export function formatMa(ma: number): string {
  if (ma === 0) return 'presente';
  if (ma >= 1000) return `${nf(3).format(ma / 1000)} Ga`;
  if (ma < 0.1) return `${nf(0).format(ma * 1_000_000)} anos`;
  return `${nf(ma < 10 ? 4 : 3).format(ma)} Ma`;
}

export function formatAge(a: Age): string {
  if (a.ma === 0) return 'presente';
  const pm = a.plusMinus ? ` ± ${a.ma >= 1000 ? nf(3).format(a.plusMinus / 1000) : nf(3).format(a.plusMinus)}` : '';
  const base = formatMa(a.ma);
  if (pm) {
    const [num, unit] = base.split(' ');
    return `${a.approx ? "~" : ""}${num}${pm} ${unit}`;
  }
  return a.approx ? `~${base}` : base;
}

export function formatDuration(myr: number): string {
  if (myr >= 1000) return `${nf(2).format(myr / 1000)} bilhões de anos`;
  if (myr >= 1) return `${nf(1).format(myr)} milhões de anos`;
  return `${nf(0).format(myr * 1_000_000)} anos`;
}

export const RANK_LABEL: Record<Rank, string> = { eon: 'Éon', era: 'Era', period: 'Período', epoch: 'Época' };

export function formatReference(r: Reference): string {
  const authors = r.author.map((a) => a.literal ?? `${a.family}${a.given ? ', ' + a.given : ''}`).join('; ');
  const year = r.issued['date-parts'][0]?.[0] || 's.d.';
  const where = [r['container-title'], r.volume, r.page].filter(Boolean).join(', ');
  return `${authors} (${year}). ${r.title}.${where ? ' ' + where + '.' : ''}`;
}

/** Texto preto ou branco conforme a luminância da cor de fundo. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#1b1d1f' : '#ffffff';
}

// ---------- Cinco grandes extinções: numeradas da mais antiga para a mais recente ----------
const BIG_FIVE = events.filter((e) => e.type === 'mass_extinction').sort((a, b) => b.time.start.ma - a.time.start.ma);
const ORD_WORDS = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta'];
/** 1 a 5, ou null se o evento não for uma das grandes extinções. */
export const extinctionNumber = (id: string) => { const i = BIG_FIVE.findIndex((e) => e.id === id); return i < 0 ? null : i + 1; };
export const extinctionLabel = (id: string) => { const n = extinctionNumber(id); return n ? `${n}ª grande extinção` : null; };
export const extinctionWord = (id: string) => { const n = extinctionNumber(id); return n ? ORD_WORDS[n - 1] : ''; };
