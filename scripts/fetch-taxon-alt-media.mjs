// Segunda imagem para cada organismo, do tipo que falta: se a principal é fóssil, busca uma
// reconstrução artística; se é reconstrução, busca foto de fóssil/esqueleto. Fonte: Wikimedia Commons.
// Critérios: título contém o nome do gênero; licença livre; sem categorias de IA ou "Inaccurate paleoart".
// Uso: node scripts/fetch-taxon-alt-media.mjs   (mescla em src/data/media/media.json, slot "alt")
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'Geolytha/0.1 (prototipo educativo)' };
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ALLOWED = /^(public domain|cc0|cc by(-sa)? [0-9.]+( [a-z]+)?|no restrictions)$/i;
const BAD = /AI-generated|artificial intelligence|Inaccurate|Outdated|obsolete/i;
// exclusões após revisão manual ("Ecce Homo" casava com o gênero Homo; figura técnica de embrião de Lystrosaurus)
const EXCLUDE = /Ecce Homo|Lystrosaurus embryo/i;
const ART = /restoration|reconstruct|paleoart|life[ _-]?restor|artist|illustration|render|model/i;
const FOSSIL = /fossil|skelet|skull|specimen|holotype|museum|mount|cast/i;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let i = 0; i < 8; i++) {
    await pause(2500);
    const t = await (await fetch(url, { headers: UA })).text();
    try { return JSON.parse(t); } catch { /* limite */ }
    process.stdout.write(`(limite: aguardando ${30 * (i + 1)}s) `);
    await pause(30000 * (i + 1));
  }
  throw new Error('falha: ' + url);
}

const mediaPath = join(root, 'src/data/media/media.json');
const db = JSON.parse(readFileSync(mediaPath, 'utf8'));
const taxa = JSON.parse(readFileSync(join(root, 'src/data/taxa/taxa.json'), 'utf8')).taxa;
const today = new Date().toISOString().slice(0, 10);
const keep = db.media.filter((m) => m.slot !== 'alt');
const added = [];

for (const t of taxa) {
  const primary = keep.find((m) => m.taxonId === t.id);
  const want = primary?.kind === 'artistic_reconstruction' ? 'fossil_photo' : 'artistic_reconstruction';
  const q = want === 'artistic_reconstruction' ? `${t.name} restoration` : `${t.name} fossil`;
  process.stdout.write(`${t.name} (${want === 'artistic_reconstruction' ? 'reconstrução' : 'fóssil'})… `);
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?format=json&action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=imageinfo|categories&cllimit=max&iiprop=url|size|extmetadata&iiurlwidth=900`);
  const pages = Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const pick = pages.find((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.width < 500) return false;
    if (primary && ii.descriptionurl === primary.sourceUrl) return false;
    const title = p.title.replace('File:', '');
    if (!title.toLowerCase().includes(t.name.toLowerCase()) || EXCLUDE.test(title)) return false;
    const cats = (p.categories ?? []).map((c) => c.title).join(' | ');
    const e = ii.extmetadata ?? {};
    const desc = strip(e.ImageDescription?.value);
    if (BAD.test(cats) || BAD.test(desc)) return false;
    if (!ALLOWED.test(strip(e.LicenseShortName?.value))) return false;
    const text = `${title} ${desc} ${cats}`;
    return want === 'artistic_reconstruction' ? ART.test(text) && !/skelet|holotype/i.test(title) : FOSSIL.test(text);
  });
  if (!pick) { console.log('nada adequado'); continue; }
  const ii = pick.imageinfo[0], e = ii.extmetadata ?? {};
  added.push({
    id: `taxon-${t.id}-alt`, taxonId: t.id, slot: 'alt', url: ii.thumburl ?? ii.url, kind: want,
    caption: strip(e.ImageDescription?.value).slice(0, 300) || pick.title.replace('File:', '').replace(/\.\w+$/, ''),
    credit: strip(e.Artist?.value) || strip(e.Credit?.value), source: strip(e.Credit?.value),
    license: strip(e.LicenseShortName?.value), licenseUrl: e.LicenseUrl?.value ?? null, sourceUrl: ii.descriptionurl,
    modified: 'Exibida reduzida.', aiGenerated: false, fetchedAt: today,
    classifiedBy: 'heurística (busca dirigida + título com o nome do gênero) — conferir visualmente',
  });
  console.log(pick.title.replace('File:', '').slice(0, 70));
}
db.media = [...keep, ...added];
writeFileSync(mediaPath, JSON.stringify(db, null, 1) + '\n');
console.log(`✓ ${added.length} imagens alternativas`);
