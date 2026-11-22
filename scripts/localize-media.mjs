// Baixa cada imagem de src/data/media/media.json (Wikimedia Commons) uma única vez e grava
// cópias otimizadas em public/media/: <id>.webp (grande) e <id>-sm.webp (miniatura dos cartões).
// O crédito, a licença e o link da fonte continuam em media.json; o campo "file" aponta para a cópia.
// Uso: node scripts/localize-media.mjs        (só baixa o que ainda não existe)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const MEDIA = 'src/data/media/media.json';
const OUT = 'public/media';
const UA = { 'User-Agent': 'Geolytha/0.1 (atlas educativo de codigo aberto)' };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const data = JSON.parse(readFileSync(MEDIA, 'utf8'));
let done = 0, failed = [];

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: UA }).catch(() => null);
    if (r?.ok) return Buffer.from(await r.arrayBuffer());
    const wait = r?.status === 429 ? 15000 * (attempt + 1) : 4000;
    console.warn(`  ${r?.status ?? 'erro de rede'}; nova tentativa em ${wait / 1000}s`);
    await pause(wait);
  }
  return null;
}

for (const m of data.media) {
  const big = `${OUT}/${m.id}.webp`, sm = `${OUT}/${m.id}-sm.webp`;
  if (existsSync(big) && existsSync(sm)) { m.file = `media/${m.id}.webp`; continue; }
  console.log(`${m.id}`);
  const buf = await fetchWithRetry(m.url);
  if (!buf) { failed.push(m.id); continue; }
  const isCover = m.id.startsWith('cover-');
  await sharp(buf).rotate().resize({ width: isCover ? 1600 : 1200, withoutEnlargement: true }).webp({ quality: 78 }).toFile(big);
  await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toFile(sm);
  m.file = `media/${m.id}.webp`;
  done++;
  writeFileSync(MEDIA, JSON.stringify(data, null, 2) + '\n');
  await pause(1500);
}
writeFileSync(MEDIA, JSON.stringify(data, null, 2) + '\n');
console.log(`\nbaixadas agora: ${done} · falharam: ${failed.length}${failed.length ? ' (' + failed.join(', ') + ')' : ''}`);
