// Capas próprias para épocas e para o Ediacarano (curadoria manual, revisão visual em 2026-11-20).
// Cada arquivo foi escolhido porque o tema corresponde à época (ex.: biota de Fezouata → Ordoviciano Inferior).
// Mescla em src/data/media/media.json. Uso: node scripts/fetch-epoch-covers.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'Geolytha/0.1 (prototipo educativo)' };
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ALLOWED = /^(public domain|cc0|cc by(-sa)? [0-9.]+( [a-z]+)?|no restrictions)$/i;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const COVERS = {
  ediacaran: { file: 'Charnia and Fractofusus Inner Meadow Lagerstätte.jpg', kind: 'fossil_photo' },
  miaolingian: { file: 'Life on the platform margin of the Miaolingian sea, North China.png', kind: 'artistic_reconstruction' },
  'lower-ordovician': { file: 'Fezouata Biota.jpg', kind: 'artistic_reconstruction' },
  llandovery: { file: 'Waukesha Biota reconstruction.png', kind: 'artistic_reconstruction' },
  wenlock: { file: 'Herefordshire Biota.png', kind: 'artistic_reconstruction' },
  'upper-devonian': { file: 'Hyneria.jpg', kind: 'artistic_reconstruction' },
  guadalupian: { file: 'Moschops capensis.jpg', kind: 'artistic_reconstruction' },
  'lower-jurassic': { file: 'Ciechocinek Formation Reconstruction.jpg', kind: 'artistic_reconstruction' },
  'upper-jurassic': { file: 'Europasaurus holgeri Scene 2.jpg', kind: 'artistic_reconstruction' },
  'lower-cretaceous': { file: 'El Soplao amber (paleoenvironmental restoration).png', kind: 'artistic_reconstruction' },
  // Cretáceo Superior: o retrato em close de Tylosaurus não funcionou como capa; a época usa a cena do período (USGS)
  // sem pôster TTT para o Holoceno: usa a evidência que define o seu início (GSSP num testemunho de gelo da Groenlândia)
  holocene: {
    file: 'Ice core researchers from AWI drilling at the EastGRIP ice core site, Greenland 1.jpg', kind: 'geologic_evidence',
    caption: 'Perfuração de um testemunho de gelo na Groenlândia (projeto EastGRIP). O início do Holoceno, há 11.700 anos, é definido num registro desse tipo: o testemunho de gelo NGRIP, também da Groenlândia.',
  },
};

async function getJson(url) {
  for (let i = 0; i < 8; i++) {
    await pause(3000);
    const t = await (await fetch(url, { headers: UA })).text();
    try { return JSON.parse(t); } catch { /* limite */ }
    await pause(30000 * (i + 1));
  }
  throw new Error('falha: ' + url);
}

const mediaPath = join(root, 'src/data/media/media.json');
const db = JSON.parse(readFileSync(mediaPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const ids = new Set([...Object.keys(COVERS), 'upper-cretaceous']); // remove capas retiradas
db.media = db.media.filter((m) => !(m.intervalId && ids.has(m.intervalId)));
for (const [intervalId, c] of Object.entries(COVERS)) {
  process.stdout.write(`${intervalId}… `);
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400&titles=${encodeURIComponent('File:' + c.file)}`);
  const ii = Object.values(j.query.pages)[0].imageinfo?.[0];
  if (!ii) { console.log('não encontrado'); continue; }
  const e = ii.extmetadata ?? {};
  const license = strip(e.LicenseShortName?.value);
  if (!ALLOWED.test(license)) { console.log('licença ' + license); continue; }
  db.media.push({
    id: `cover-${intervalId}`, intervalId, url: ii.thumburl ?? ii.url, kind: c.kind,
    caption: c.caption ?? (strip(e.ImageDescription?.value).slice(0, 300) || c.file.replace(/\.\w+$/, '')),
    credit: strip(e.Artist?.value) || strip(e.Credit?.value), source: strip(e.Credit?.value),
    license, licenseUrl: e.LicenseUrl?.value ?? null, sourceUrl: ii.descriptionurl,
    modified: 'Exibida recortada para a capa.', aiGenerated: false, fetchedAt: today, classifiedBy: 'curadoria manual com revisão visual',
  });
  console.log(license);
}
writeFileSync(mediaPath, JSON.stringify(db, null, 1) + '\n');
console.log('✓ capas de época atualizadas');
