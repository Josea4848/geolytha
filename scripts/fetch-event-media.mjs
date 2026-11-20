// Imagens de EVIDÊNCIA para marcos e extinções (curadoria manual de arquivos do Wikimedia Commons).
// Para cada evento: arquivo escolhido + legenda própria explicando a relação da imagem com o evento.
// Mescla em src/data/media/media.json (substitui entradas com eventId). Uso: node scripts/fetch-event-media.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'Geolytha/0.1 (prototipo educativo)' };
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ALLOWED = /^(public domain|cc0|cc by(-sa)? [0-9.]+( [a-z]+)?|no restrictions)$/i;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** kind: fossil_photo = fóssil/espécime; geologic_evidence = rocha/evidência geológica; artistic_reconstruction = ilustração */
const EVENTS = {
  'earth-formation': {
    file: 'Allende meteorite.jpg', kind: 'geologic_evidence',
    caption: 'Fatia do meteorito Allende, formado junto com o Sistema Solar. Meteoritos como este são a base da datação da Terra em ~4,54 Ga.',
  },
  'earliest-life': {
    file: 'Stromatolite (Strelley Pool Formation, Paleoarchean, 3.35-3.46 Ga; East Strelley Greenstone Belt, Pilbara Craton, Western Australia) 3 (16750046154).jpg', kind: 'fossil_photo',
    caption: 'Estromatólito silicificado da Formação Strelley Pool (Pilbara, Austrália), a mesma unidade estudada por Allwood et al. (2006).',
  },
  'goe': {
    file: 'Banded Iron Formation of Hamersley Range DSCN2938.jpg', kind: 'geologic_evidence',
    caption: 'Formação ferrífera bandada da Hamersley Range (Austrália). Essas rochas registram mudanças na química dos oceanos ligadas à oxigenação; não são, sozinhas, prova do evento.',
  },
  'cambrian-explosion': {
    file: 'Waptia fieldensis & Marrella splendens (fossil arthropods) (Burgess Shale Formation, Middle Cambrian; Walcott Quarry, above Field, British Columbia, Canada).jpg', kind: 'fossil_photo',
    caption: 'Artrópodes fósseis do Burgess Shale (Canadá, ~508 Ma), um dos registros mais ricos da fauna cambriana, um pouco posterior ao pico da diversificação.',
  },
  'land-plants': {
    file: 'Tetrade.jpg', kind: 'fossil_photo',
    caption: 'Criptósporo em tétrade (Tetrahedraletes medinensis). Esporos desse tipo são o registro mais antigo de plantas terrestres (vista ao microscópio).',
  },
  'first-dinosaurs': {
    file: 'Eoraptor lunensis.jpg', kind: 'fossil_photo',
    caption: 'Ossos de Eoraptor lunensis aflorando no solo do Vale de la Luna (Ischigualasto, Argentina), uma das localidades dos dinossauros mais antigos.',
  },
  'first-birds': {
    file: 'Berlin Archaeopteryx.jpg', kind: 'fossil_photo',
    caption: 'Exemplar de Berlim de Archaeopteryx lithographica (original, Museum für Naturkunde), com impressões de penas.',
  },
  'mammal-radiation': {
    file: 'Mixodectes skeleton.png', kind: 'fossil_photo',
    caption: 'Esqueleto composto de Mixodectes pungens, mamífero do Paleoceno do Novo México (figura de artigo científico).',
  },
  'genus-homo': {
    file: 'Homo habilis-MGL 95213-P4150645-black.jpg', kind: 'unclassified',
    caption: 'Crânio de Homo habilis em exposição (Musée cantonal de géologie, Lausanne; pode ser réplica). O fóssil citado no marco é a mandíbula LD 350-1, de ~2,8 Ma.',
  },
  'ext-end-permian': {
    file: 'Permian-Triassic boundary at Frazer Beach, NSW.jpg', kind: 'geologic_evidence',
    caption: 'Fronteira Permiano–Triássico exposta em Frazer Beach (Nova Gales do Sul, Austrália), seção estudada para entender a extinção em ambiente continental.',
  },
  'ext-k-pg': {
    file: 'Cretaceous–Paleogene boundary in Colorado 1.JPG', kind: 'geologic_evidence',
    caption: 'Fronteira Cretáceo–Paleógeno exposta em Trinidad Lake (Colorado, EUA), uma das seções clássicas onde a camada da fronteira registra o impacto.',
  },
};

async function getJson(url) {
  for (let i = 0; i < 8; i++) {
    await pause(3000);
    const r = await fetch(url, { headers: UA });
    const t = await r.text();
    try { return JSON.parse(t); } catch { /* limite de requisições: espera e tenta de novo */ }
    process.stdout.write(`(aguardando limite ${30 * (i + 1)}s) `);
    await pause(30000 * (i + 1));
  }
  throw new Error(`falha: ${url}`);
}

const mediaPath = join(root, 'src/data/media/media.json');
const db = JSON.parse(readFileSync(mediaPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
db.media = db.media.filter((m) => !m.eventId);
for (const [eventId, ev] of Object.entries(EVENTS)) {
  process.stdout.write(`${eventId}… `);
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&titles=${encodeURIComponent('File:' + ev.file)}`);
  const p = Object.values(j.query.pages)[0];
  const ii = p.imageinfo?.[0];
  if (!ii) { console.log('arquivo não encontrado'); continue; }
  const e = ii.extmetadata ?? {};
  const license = strip(e.LicenseShortName?.value);
  if (!ALLOWED.test(license)) { console.log(`ignorada (licença: ${license})`); continue; }
  db.media.push({
    id: `event-${eventId}`, eventId, url: ii.thumburl ?? ii.url, kind: ev.kind, caption: ev.caption,
    credit: strip(e.Artist?.value) || strip(e.Credit?.value), source: strip(e.Credit?.value),
    license, licenseUrl: e.LicenseUrl?.value ?? null, sourceUrl: ii.descriptionurl,
    modified: 'Exibida reduzida.', aiGenerated: false, fetchedAt: today, classifiedBy: 'curadoria manual',
  });
  console.log(license);
}
writeFileSync(mediaPath, JSON.stringify(db, null, 1) + '\n');
console.log(`✓ ${db.media.filter((m) => m.eventId).length} imagens de eventos`);
