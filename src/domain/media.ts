import mediaRaw from '../data/media/media.json';
import { ancestors, childrenOf, events, getInterval } from './chronology';
import type { Interval } from './schema';

export type MediaKind = 'artistic_reconstruction' | 'fossil_photo' | 'geologic_evidence' | 'unclassified';
export type Media = {
  id: string;
  intervalId?: string;
  taxonId?: string;
  eventId?: string;
  slot?: 'alt';
  url: string;
  /** cópia otimizada hospedada no próprio site (public/), gerada por scripts/localize-media.mjs */
  file?: string;
  crop?: { left: number; top: number; width: number; height: number };
  kind: MediaKind;
  caption: string;
  credit: string;
  source: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  modified: string;
};

/** imagem grande: cópia local quando existe, senão a original do Commons */
export const imgSrc = (m: Media) => (m.file ? `${import.meta.env.BASE_URL}${m.file}` : m.url);
/** miniatura dos cartões */
export const thumbSrc = (m: Media) => (m.file ? `${import.meta.env.BASE_URL}${m.file.replace(/\.webp$/, '-sm.webp')}` : m.url);

const all = ((mediaRaw as { media?: Media[] }).media ?? []) as Media[];
const byInterval = new Map(all.filter((m) => m.intervalId).map((m) => [m.intervalId!, m]));
const byTaxon = new Map(all.filter((m) => m.taxonId && m.slot !== 'alt').map((m) => [m.taxonId!, m]));

export const KIND_LABEL: Record<MediaKind, string> = {
  artistic_reconstruction: 'Reconstrução artística',
  fossil_photo: 'Fóssil / espécime',
  geologic_evidence: 'Rocha / evidência geológica',
  unclassified: 'Imagem não classificada',
};

export const mediaForTaxon = (id: string) => byTaxon.get(id);
/** Todas as imagens do organismo: principal primeiro, depois a alternativa (outro tipo). */
export const mediaListForTaxon = (id: string) => all.filter((m) => m.taxonId === id).sort((a, b) => Number(a.slot === 'alt') - Number(b.slot === 'alt'));
const byEvent = new Map(all.filter((m) => m.eventId).map((m) => [m.eventId!, m]));
export const mediaForEvent = (id: string) => byEvent.get(id);

/**
 * Capa do intervalo: a própria; senão a do ancestral mais próximo (ex.: Jurássico Inferior → Jurássico);
 * senão a do primeiro subintervalo que tiver (ex.: Paleozoico → Cambriano). `from` diz de onde veio.
 */
export function coverFor(id: string): { media: Media; from: Interval; event?: string } | null {
  const own = byInterval.get(id);
  if (own) return { media: own, from: getInterval(id)! };
  for (const a of [...ancestors(id)].reverse()) {
    const m = byInterval.get(a.id);
    if (m) return { media: m, from: a };
  }
  const queue = [...childrenOf(id)];
  while (queue.length) {
    const c = queue.shift()!;
    const m = byInterval.get(c.id);
    if (m) return { media: m, from: c };
    queue.push(...childrenOf(c.id));
  }
  // sem ilustração: usa a imagem de evidência de um marco ou extinção do próprio intervalo
  const iv = getInterval(id)!;
  const ev = events.filter((e) => e.time.start.ma <= iv.start.ma && e.time.start.ma >= iv.end.ma).find((e) => byEvent.has(e.id));
  if (ev) return { media: byEvent.get(ev.id)!, from: iv, event: ev.name.pt };
  return null;
}

/** Estilo CSS que mostra só a região `crop` da imagem, preenchendo o contêiner. */
export function cropStyle(m: Media): React.CSSProperties {
  if (!m.crop) return { objectFit: 'cover' };
  const c = m.crop;
  return {
    position: 'absolute',
    width: `${100 / c.width}%`,
    height: `${100 / c.height}%`,
    left: `${(-c.left / c.width) * 100}%`,
    top: `${(-c.top / c.height) * 100}%`,
    maxWidth: 'none',
  };
}
