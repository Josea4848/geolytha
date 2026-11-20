import { z } from 'zod';

/** Idade em milhões de anos antes do presente (Ma). 0 = presente. */
export const AgeSchema = z.object({
  ma: z.number().min(0).max(4600),
  plusMinus: z.number().positive().optional(),
  approx: z.boolean().optional(),
});
export type Age = z.infer<typeof AgeSchema>;

export const ConfidenceSchema = z.enum(['established', 'well_supported', 'debated', 'speculative']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

const Localized = z.object({ pt: z.string().min(1), en: z.string().min(1) });
const RefIds = z.array(z.string().min(1)).min(1, 'todo conteúdo científico precisa de ao menos uma referência');

export const RankSchema = z.enum(['eon', 'era', 'period', 'epoch']);
export type Rank = z.infer<typeof RankSchema>;
export const RANKS: Rank[] = ['eon', 'era', 'period', 'epoch'];

export const IntervalSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: Localized,
  rank: RankSchema,
  parentId: z.string().optional(),
  start: AgeSchema,
  end: AgeSchema,
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  status: z.enum(['formal', 'informal']).optional(),
  note: z.string().optional(),
  refs: RefIds,
});
export type Interval = z.infer<typeof IntervalSchema>;

export const ChronoMetaSchema = z.object({
  source: z.string(),
  version: z.string(),
  consultedAt: z.string().nullable(),
  verificationStatus: z.enum(['pending', 'verified']),
  colorsVerified: z.boolean(),
  license: z.string().optional(),
  note: z.string().optional(),
  refs: RefIds,
});
export type ChronoMeta = z.infer<typeof ChronoMetaSchema>;

export const EventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['milestone', 'radiation', 'mass_extinction', 'geologic', 'climatic']),
  name: Localized,
  time: z.object({ start: AgeSchema, end: AgeSchema.optional() }),
  summary: z.string().min(1),
  confidence: ConfidenceSchema,
  diversityLoss: z.object({ metric: z.enum(['species', 'genus', 'family']), pct: z.number().min(0).max(100), note: z.string(), refs: RefIds }).optional(),
  hypotheses: z.array(z.object({ text: z.string(), confidence: ConfidenceSchema, refs: RefIds })).optional(),
  refs: RefIds,
});
export type GeoEvent = z.infer<typeof EventSchema>;

export const ReferenceSchema = z
  .object({
    id: z.string().min(1),
    type: z.string(),
    title: z.string(),
    author: z.array(z.object({ family: z.string().optional(), given: z.string().optional(), literal: z.string().optional() })),
    'container-title': z.string().optional(),
    volume: z.string().optional(),
    page: z.string().optional(),
    issued: z.object({ 'date-parts': z.array(z.array(z.number())) }),
    DOI: z.string().optional(),
    URL: z.string().url().optional(),
    note: z.string().optional(),
    verificationStatus: z.enum(['pending', 'verified']),
  })
  .passthrough();
export type Reference = z.infer<typeof ReferenceSchema>;

export const ReconstructionSetSchema = z.object({
  model: z.string(),
  modelName: z.string(),
  layerDescription: z.string(),
  license: z.string(),
  licenseNote: z.string().optional(),
  modelVersion: z.string().optional(),
  attribution: z.string().optional(),
  licenseCheckedAt: z.string().optional(),
  limitations: z.array(z.string()),
  snapshots: z.array(z.object({
    id: z.string(),
    age: AgeSchema,
    model: z.string(),
    layer: z.literal('coastlines'),
    file: z.string(),
    sourceUrl: z.string().url(),
    generatedWith: z.string(),
    generatedAt: z.string(),
    simplification: z.string(),
    confidence: ConfidenceSchema,
    refs: RefIds,
  })).min(1),
});
export type ReconstructionSet = z.infer<typeof ReconstructionSetSchema>;
export type Snapshot = ReconstructionSet['snapshots'][number];

export const TaxonGroupSchema = z.enum(['marine_inv', 'fish', 'amphibian', 'reptile', 'dinosaur', 'bird', 'synapsid', 'mammal', 'plant', 'fungus', 'other']);
export type TaxonGroup = z.infer<typeof TaxonGroupSchema>;
const MaRange = z.object({ max: z.number().nullable(), min: z.number().nullable() });

export const TaxaFileSchema = z.object({
  source: z.string(),
  license: z.string(),
  fetchedAt: z.string(),
  paleocoordinates: z.string(),
  taxa: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string(),
    rank: z.string(),
    authority: z.string().nullable(),
    commonName: z.string().nullable(),
    group: TaxonGroupSchema,
    extant: z.boolean(),
    classification: z.object({ phylum: z.string().nullable(), class: z.string().nullable(), order: z.string().nullable(), family: z.string().nullable() }),
    range: z.object({ first: MaRange, last: MaRange.nullable(), earlyInterval: z.string().nullable(), lateInterval: z.string().nullable() }),
    pbdb: z.object({ taxonNo: z.number().int(), occurrences: z.number().int(), fetchedAt: z.string() }),
    mapAge: z.number().nullable(),
    localities: z.array(z.object({
      collection: z.string(), lon: z.number(), lat: z.number(),
      early: z.number().nullable(), late: z.number().nullable(), cc: z.string().nullable(),
      plon: z.number().nullable().optional(), plat: z.number().nullable().optional(),
    })),
    refs: RefIds,
  })).min(1),
});
export type TaxaFile = z.infer<typeof TaxaFileSchema>;
export type Taxon = TaxaFile['taxa'][number];

export const TextEvidenceSchema = z.enum(['fossil_direct', 'comparative_anatomy', 'geochemical', 'hypothesis']);
export type TextEvidence = z.infer<typeof TextEvidenceSchema>;
export const TaxonTextsSchema = z.object({
  note: z.string(), curatedAt: z.string(), method: z.string(),
  texts: z.record(z.string(), z.object({
    summary: z.string().min(1),
    sections: z.array(z.object({
      field: z.enum(['identity', 'anatomy', 'habitat', 'diet', 'behavior', 'significance']),
      text: z.string().min(1), evidence: TextEvidenceSchema, confidence: ConfidenceSchema, refs: RefIds,
    })).min(1),
  })),
});
export type TaxonTexts = z.infer<typeof TaxonTextsSchema>;
