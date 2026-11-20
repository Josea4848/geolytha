import { z } from 'zod';
const RefIdsLoose = z.array(z.string().min(1)).min(1);
import { ChronoMetaSchema, EventSchema, IntervalSchema, ReconstructionSetSchema, ReferenceSchema, TaxaFileSchema, TaxonTextsSchema, RANKS, type Interval } from './schema';

export type RawData = {
  intervals: unknown; meta: unknown; events: unknown; references: unknown; reconstructions: unknown; taxa: unknown;
  /** Verifica se o arquivo de cada instantâneo existe (injetado pelo script de Node). */
  fileExists?: (relPath: string) => boolean;
  media?: unknown; diversity?: unknown; climate?: unknown; texts?: unknown;
};

/** Valida esquemas e integridade referencial. Retorna lista de erros (vazia = ok). */
export function validateData(raw: RawData): string[] {
  const errors: string[] = [];
  const parse = <T,>(schema: z.ZodType<T>, value: unknown, label: string): T | null => {
    const r = schema.safeParse(value);
    if (!r.success) {
      for (const issue of r.error.issues) errors.push(`${label}: ${issue.path.join('.')} — ${issue.message}`);
      return null;
    }
    return r.data;
  };

  const intervals = parse(z.array(IntervalSchema), raw.intervals, 'intervals') ?? [];
  const meta = parse(ChronoMetaSchema, raw.meta, 'meta');
  const events = parse(z.array(EventSchema), raw.events, 'events') ?? [];
  const references = parse(z.array(ReferenceSchema), raw.references, 'references') ?? [];

  const refIds = new Set<string>();
  for (const r of references) {
    if (refIds.has(r.id)) errors.push(`references: id duplicado ${r.id}`);
    refIds.add(r.id);
  }
  const checkRefs = (refs: string[], label: string) => {
    for (const ref of refs) if (!refIds.has(ref)) errors.push(`${label}: referência inexistente "${ref}"`);
  };

  const byId = new Map<string, Interval>();
  for (const iv of intervals) {
    if (byId.has(iv.id)) errors.push(`intervals: id duplicado ${iv.id}`);
    byId.set(iv.id, iv);
    checkRefs(iv.refs, `intervals.${iv.id}`);
    if (iv.start.ma <= iv.end.ma) errors.push(`intervals.${iv.id}: início (${iv.start.ma}) deve ser mais antigo que o fim (${iv.end.ma})`);
  }
  if (meta) checkRefs(meta.refs, 'meta');

  // Hierarquia: pai existe, pai é exatamente um nível acima, filho contido no pai.
  for (const iv of intervals) {
    const level = RANKS.indexOf(iv.rank);
    if (!iv.parentId) {
      if (iv.rank !== 'eon') errors.push(`intervals.${iv.id}: apenas éons podem não ter pai`);
      continue;
    }
    const p = byId.get(iv.parentId);
    if (!p) { errors.push(`intervals.${iv.id}: pai inexistente ${iv.parentId}`); continue; }
    if (RANKS.indexOf(p.rank) !== level - 1) errors.push(`intervals.${iv.id}: pai ${p.id} não está um nível acima`);
    if (iv.start.ma > p.start.ma || iv.end.ma < p.end.ma) errors.push(`intervals.${iv.id}: fora do intervalo do pai ${p.id}`);
  }

  // Cobertura: éons contíguos até 0; filhos de cada pai contíguos e cobrindo-o inteiro.
  const checkContiguous = (list: Interval[], from: number, to: number, label: string) => {
    if (list.length === 0) return;
    const sorted = [...list].sort((a, b) => b.start.ma - a.start.ma);
    if (sorted[0].start.ma !== from) errors.push(`${label}: começa em ${sorted[0].start.ma}, esperado ${from}`);
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i].start.ma !== sorted[i - 1].end.ma)
        errors.push(`${label}: lacuna/sobreposição entre ${sorted[i - 1].id} e ${sorted[i].id}`);
    if (sorted[sorted.length - 1].end.ma !== to) errors.push(`${label}: termina em ${sorted[sorted.length - 1].end.ma}, esperado ${to}`);
  };
  const eons = intervals.filter((i) => i.rank === 'eon');
  checkContiguous(eons, Math.max(...eons.map((e) => e.start.ma)), 0, 'éons');
  for (const p of intervals) {
    checkContiguous(intervals.filter((c) => c.parentId === p.id), p.start.ma, p.end.ma, `filhos de ${p.id}`);
  }

  const evIds = new Set<string>();
  for (const ev of events) {
    if (evIds.has(ev.id)) errors.push(`events: id duplicado ${ev.id}`);
    evIds.add(ev.id);
    checkRefs(ev.refs, `events.${ev.id}`);
    ev.hypotheses?.forEach((h, k) => checkRefs(h.refs, `events.${ev.id}.hypotheses[${k}]`));
    if (ev.diversityLoss) checkRefs(ev.diversityLoss.refs, `events.${ev.id}.diversityLoss`);
    if (ev.time.end && ev.time.end.ma > ev.time.start.ma) errors.push(`events.${ev.id}: fim mais antigo que início`);
  }

  const recs = parse(ReconstructionSetSchema, raw.reconstructions, 'reconstructions');
  if (recs) {
    const seen = new Set<number>();
    for (const sn of recs.snapshots) {
      checkRefs(sn.refs, `reconstructions.${sn.id}`);
      if (seen.has(sn.age.ma)) errors.push(`reconstructions: idade duplicada ${sn.age.ma}`);
      seen.add(sn.age.ma);
      if (raw.fileExists && !raw.fileExists(sn.file)) errors.push(`reconstructions.${sn.id}: arquivo ausente ${sn.file}`);
    }
  }

  const taxa = parse(TaxaFileSchema, raw.taxa, 'taxa');
  if (taxa) {
    const snapAges = new Set(recs?.snapshots.map((s) => s.age.ma) ?? []);
    const ids = new Set<string>();
    for (const t of taxa.taxa) {
      if (ids.has(t.id)) errors.push(`taxa: id duplicado ${t.id}`);
      ids.add(t.id);
      checkRefs(t.refs, `taxa.${t.id}`);
      if (t.mapAge !== null && !snapAges.has(t.mapAge)) errors.push(`taxa.${t.id}: mapAge ${t.mapAge} não corresponde a nenhum instantâneo`);
    }
  }
  // ---- mídia: licença livre, destino existente, URL https ----
  const MediaSchema = z.object({ media: z.array(z.object({
    id: z.string(), intervalId: z.string().optional(), taxonId: z.string().optional(), eventId: z.string().optional(), url: z.string().url().startsWith('https://'),
    kind: z.enum(['artistic_reconstruction', 'fossil_photo', 'geologic_evidence', 'unclassified']), credit: z.string(), license: z.string(),
    sourceUrl: z.string().url(), aiGenerated: z.literal(false),
  }).passthrough()) });
  const media = raw.media === undefined ? null : parse(MediaSchema, raw.media, 'media');
  const FREE = /^(public domain|cc0|cc by(-sa)? [0-9.]+( [a-z]+)?|no restrictions)$/i;
  const taxonIds = new Set((taxa?.taxa ?? []).map((t) => t.id));
  for (const m of media?.media ?? []) {
    if (!FREE.test(m.license)) errors.push(`media.${m.id}: licença não livre ou desconhecida "${m.license}"`);
    if (m.intervalId && !byId.has(m.intervalId)) errors.push(`media.${m.id}: intervalo inexistente ${m.intervalId}`);
    if (m.taxonId && taxa && !taxonIds.has(m.taxonId)) errors.push(`media.${m.id}: organismo inexistente ${m.taxonId}`);
    if (m.eventId && !evIds.has(m.eventId)) errors.push(`media.${m.id}: evento inexistente ${m.eventId}`);
    if (!m.intervalId && !m.taxonId && !m.eventId) errors.push(`media.${m.id}: sem destino (intervalo, organismo ou evento)`);
  }

  // ---- séries numéricas (diversidade, clima) ----
  const SeriesFile = z.object({ refs: RefIdsLoose, license: z.string() }).passthrough();
  for (const [label, val] of [['diversity', raw.diversity], ['climate', raw.climate]] as const) {
    if (val === undefined) continue;
    const d = parse(SeriesFile, val, label);
    if (d) checkRefs(d.refs as string[], label);
  }
  const div = raw.diversity as { bins?: { start: number; end: number; genera: number }[] } | undefined;
  div?.bins?.forEach((b, k) => { if (!(b.start > b.end) || b.genera < 0) errors.push(`diversity.bins[${k}]: intervalo ou contagem inválidos`); });
  const clim = raw.climate as { series?: { ma: number; gmst: number }[] } | undefined;
  const seenMa = new Set<number>();
  clim?.series?.forEach((p) => { if (seenMa.has(p.ma)) errors.push(`climate: idade duplicada ${p.ma}`); seenMa.add(p.ma); if (p.gmst < -20 || p.gmst > 60) errors.push(`climate: valor implausível em ${p.ma} Ma`); });

  const texts = raw.texts === undefined ? null : parse(TaxonTextsSchema, raw.texts, 'texts');
  for (const [id, t] of Object.entries(texts?.texts ?? {})) {
    if (taxa && !taxonIds.has(id)) errors.push(`texts.${id}: organismo inexistente`);
    t.sections.forEach((sec, k) => checkRefs(sec.refs, `texts.${id}.sections[${k}]`));
  }
  return errors;
}
