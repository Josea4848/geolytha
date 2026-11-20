import { geoArea, geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection, GeometryCollection } from 'geojson';
import recsRaw from '../data/paleogeo/reconstructions.json';
import type { ReconstructionSet, Snapshot } from './schema';

export const reconstructions = recsRaw as ReconstructionSet;
const snaps = [...reconstructions.snapshots].sort((a, b) => a.age.ma - b.age.ma);
/** Idade máxima coberta pelo modelo (Merdith et al. 2021 vai até 1000 Ma). */
export const MODEL_LIMIT_MA = 1000;

/** Instantâneo mais próximo da idade t, ou null se t está fora da cobertura do modelo. */
export function nearestSnapshot(t: number): { snapshot: Snapshot; delta: number } | null {
  if (t > MODEL_LIMIT_MA) return null;
  let best = snaps[0];
  for (const s of snaps) if (Math.abs(s.age.ma - t) < Math.abs(best.age.ma - t)) best = s;
  return { snapshot: best, delta: best.age.ma - t };
}

const cache = new Map<string, Promise<FeatureCollection>>();
export function loadSnapshot(s: Snapshot): Promise<FeatureCollection> {
  let p = cache.get(s.id);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${s.file}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(rewindForD3);
    p.catch(() => cache.delete(s.id));
    cache.set(s.id, p);
  }
  return p;
}

/**
 * d3-geo usa geometria esférica: um anel no sentido "errado" é lido como o complemento
 * (o planeta inteiro menos o polígono). Inverte os anéis cujo polígono cobre mais de meia esfera.
 */
function rewindForD3(input: FeatureCollection | GeometryCollection): FeatureCollection {
  // o pipeline (mapshaper sem atributos) gera GeometryCollection; normaliza para FeatureCollection
  const fc: FeatureCollection = input.type === 'GeometryCollection'
    ? { type: 'FeatureCollection', features: input.geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })) }
    : input;
  for (const f of fc.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const rings of polys) {
      if (geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach((r) => r.reverse());
    }
  }
  return fc;
}

export const MAP_COLORS = { ocean: '#24506a', oceanDeep: '#1b3d52', land: '#cdbf98', coast: 'rgba(91,79,54,0.55)', graticule: 'rgba(255,255,255,0.12)', fossil: '#d9482b' };

/** Desenha a reconstrução numa textura equiretangular (2:1) para o globo. */
export function renderEquirect(fc: FeatureCollection, width = 2048, points: [number, number][] = []): HTMLCanvasElement {
  const h = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const proj = geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, h / 2]);
  const path = geoPath(proj, ctx);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, MAP_COLORS.oceanDeep);
  grad.addColorStop(0.5, MAP_COLORS.ocean);
  grad.addColorStop(1, MAP_COLORS.oceanDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, h);
  ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = MAP_COLORS.graticule; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); path(fc); ctx.fillStyle = MAP_COLORS.land; ctx.fill();
  ctx.strokeStyle = MAP_COLORS.coast; ctx.lineWidth = 1.2; ctx.stroke();
  for (const p of points) {
    const xy = proj(p);
    if (!xy) continue;
    ctx.beginPath(); ctx.arc(xy[0], xy[1], 7, 0, 2 * Math.PI);
    ctx.fillStyle = MAP_COLORS.fossil; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  return canvas;
}
