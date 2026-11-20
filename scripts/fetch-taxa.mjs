// Importa dados factuais dos táxons curados a partir do Paleobiology Database (PBDB, CC0)
// e reconstrói as localidades fósseis com o MESMO modelo de placas do globo (MERDITH2021).
// Uso: node scripts/fetch-taxa.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const curated = JSON.parse(readFileSync(join(root, 'src/data/taxa/curated.json'), 'utf8'));
const recs = JSON.parse(readFileSync(join(root, 'src/data/paleogeo/reconstructions.json'), 'utf8'));
const snapAges = recs.snapshots.map((s) => s.age.ma);
const PBDB = 'https://paleobiodb.org/data1.2';
const today = new Date().toISOString().slice(0, 10);

const getJson = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
  }
  throw new Error(`falha: ${url}`);
};
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

async function reconstruct(points, age) {
  const out = [];
  for (let i = 0; i < points.length; i += 80) {
    const chunk = points.slice(i, i + 80);
    const q = chunk.map((p) => `${p.lon},${p.lat}`).join(',');
    const j = await getJson(`https://gws.gplates.org/reconstruct/reconstruct_points/?points=${q}&time=${age}&model=${recs.model}&return_null_points`);
    const coords = j.coordinates ?? [];
    chunk.forEach((p, k) => out.push(coords[k] ? { plon: +coords[k][0].toFixed(2), plat: +coords[k][1].toFixed(2) } : null));
  }
  return out;
}

const taxa = [];
for (const c of curated.taxa) {
  process.stdout.write(`${c.name}… `);
  // resolve homônimos: só gêneros válidos (rank 5, sem sinonímia) e, se informado, do filo esperado
  const cands = ((await getJson(`${PBDB}/taxa/list.json?match_name=${encodeURIComponent(c.name)}&show=class`)).records ?? [])
    .filter((r) => r.rnk === 5 && !r.tdf && (!c.phylum || r.phl === c.phylum));
  if (cands.length !== 1) { console.log(`IGNORADO: ${cands.length} candidatos no PBDB após o filtro (informe o filo em curated.json)`); continue; }
  const id = cands[0].oid;
  const t = (await getJson(`${PBDB}/taxa/single.json?id=${id}&show=attr,app,class,size`)).records[0];
  const occs = (await getJson(`${PBDB}/occs/list.json?base_id=${id}&show=coords,loc&limit=1000`)).records ?? [];
  // uma localidade por coleção
  const byCol = new Map();
  for (const o of occs) {
    if (o.lng == null || o.lat == null || byCol.has(o.cid)) continue;
    byCol.set(o.cid, { collection: o.cid, lon: +(+o.lng).toFixed(2), lat: +(+o.lat).toFixed(2), early: num(o.eag), late: num(o.lag), cc: o.cc2 ?? null });
  }
  const locs = [...byCol.values()];
  const extant = t.ext === '1' || t.ext === 1;
  const first = { max: num(t.fea), min: num(t.fla) };
  const last = extant ? null : { max: num(t.lea), min: num(t.lla) };
  // idade de referência para o mapa: mediana das idades médias das localidades
  const mids = locs.map((l) => (l.early + l.late) / 2).filter(Number.isFinite).sort((a, b) => a - b);
  const refAge = mids.length ? mids[Math.floor(mids.length / 2)] : null;
  let mapAge = null;
  if (refAge !== null && refAge <= 1000) {
    mapAge = snapAges.reduce((b, a) => (Math.abs(a - refAge) < Math.abs(b - refAge) ? a : b));
    const rec = await reconstruct(locs, mapAge);
    locs.forEach((l, i) => Object.assign(l, rec[i] ?? { plon: null, plat: null }));
  }
  taxa.push({
    id: c.name.toLowerCase(),
    name: c.name,
    rank: t.rnk === 5 ? 'genus' : String(t.rnk),
    authority: t.att ?? null,
    commonName: c.commonName,
    group: c.group,
    extant,
    classification: { phylum: t.phl ?? null, class: t.cll ?? null, order: t.odl ?? null, family: t.fml ?? null },
    range: { first, last, earlyInterval: t.tei ?? null, lateInterval: t.tli ?? null },
    pbdb: { taxonNo: Number(String(t.oid).replace('txn:', '')), occurrences: Number(t.noc ?? occs.length), fetchedAt: today },
    mapAge,
    localities: locs,
    refs: ['pbdb'],
  });
  console.log(`${locs.length} localidades${mapAge !== null ? `, mapa ${mapAge} Ma` : ''}`);
}

writeFileSync(join(root, 'src/data/taxa/taxa.json'), JSON.stringify({
  source: 'Paleobiology Database (paleobiodb.org), API data1.2',
  license: 'CC0-1.0',
  fetchedAt: today,
  paleocoordinates: `Localidades reconstruídas com o modelo ${recs.model} (GPlates Web Service) na idade do instantâneo indicado em mapAge.`,
  taxa,
}, null, 1) + '\n');
console.log(`✓ ${taxa.length} táxons.`);
