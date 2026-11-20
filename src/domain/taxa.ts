import type { TaxaFile, Taxon, TaxonGroup } from './schema';

let promise: Promise<TaxaFile> | null = null;
/** Os dados de táxons (~1 MB com as localidades) ficam num pedaço separado, carregado sob demanda. */
export function loadTaxa(): Promise<TaxaFile> {
  promise ??= import('../data/taxa/taxa.json').then((m) => m.default as TaxaFile);
  return promise;
}

export const GROUP_LABEL: Record<TaxonGroup, string> = {
  marine_inv: 'Invertebrados marinhos',
  fish: 'Peixes',
  amphibian: 'Anfíbios',
  reptile: 'Répteis',
  dinosaur: 'Dinossauros',
  bird: 'Aves',
  synapsid: 'Sinapsídeos',
  mammal: 'Mamíferos',
  plant: 'Plantas',
  fungus: 'Fungos',
  other: 'Outros',
};

/** Faixa de existência registrada no PBDB [mais antigo, mais recente] em Ma. */
export function span(t: Taxon): [number, number] {
  const oldest = t.range.first.max ?? t.range.first.min ?? 0;
  const youngest = t.extant ? 0 : (t.range.last?.min ?? t.range.last?.max ?? t.range.first.min ?? 0);
  return [oldest, youngest];
}

export const overlaps = (t: Taxon, start: number, end: number) => {
  const [o, y] = span(t);
  return o > end && y < start;
};

const PBDB_PLACEHOLDER = /^NO_\w+_SPECIFIED$/;
export const clean = (v: string | null) => (v && !PBDB_PLACEHOLDER.test(v) ? v : null);

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const matches = (t: Taxon, q: string) =>
  !q || norm(`${t.name} ${t.commonName ?? ''} ${t.classification.family ?? ''} ${t.classification.order ?? ''}`).includes(norm(q));

export const pbdbUrl = (t: Taxon) => `https://paleobiodb.org/classic/basicTaxonInfo?taxon_no=${t.pbdb.taxonNo}`;

/** Idade típica do gênero: mediana das idades médias das localidades fósseis (mais robusta que o meio da faixa). */
export function typicalAge(t: Taxon): number {
  const mids = t.localities.map((l) => ((l.early ?? 0) + (l.late ?? 0)) / 2).filter((x) => x > 0).sort((a, b) => a - b);
  if (mids.length) return mids[Math.floor(mids.length / 2)];
  const [o, y] = span(t);
  return (o + y) / 2;
}
