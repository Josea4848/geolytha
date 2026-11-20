// Gera os instantâneos paleogeográficos estáticos usados pelo globo e pelo mapa.
// Fonte: GPlates Web Service (EarthByte), modelo de placas MERDITH2021 (0–1000 Ma).
// Uso: node scripts/fetch-paleogeo.mjs   (roda uma vez; os arquivos gerados vão para o repositório)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'MERDITH2021';
// a cada 10 Ma no Fanerozoico, a cada 20 Ma antes; mais os limites K–Pg (66) e P–Tr (252)
const AGES = [...new Set([...Array.from({ length: 55 }, (_, i) => i * 10), ...Array.from({ length: 23 }, (_, i) => 560 + i * 20), 66, 252])].sort((a, b) => a - b);
const outDir = join(root, 'public', 'paleogeo');
const tmp = join(tmpdir(), 'atlas-paleogeo');
mkdirSync(outDir, { recursive: true });
mkdirSync(tmp, { recursive: true });

const generatedAt = new Date().toISOString().slice(0, 10);
const recs = [];
for (const age of AGES) {
  const url = `https://gws.gplates.org/reconstruct/coastlines/?time=${age}&model=${MODEL}`;
  process.stdout.write(`${age} Ma… `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const raw = join(tmp, `${age}.geojson`);
  writeFileSync(raw, await res.text());
  const out = join(outDir, `${MODEL.toLowerCase()}-${age}.json`);
  // simplificação para web: Visvalingam 8%, precisão 0,01°, remove ilhas minúsculas
  execFileSync(process.execPath, [
    join(root, 'node_modules', 'mapshaper', 'bin', 'mapshaper'),
    raw, '-filter-fields', '', '-simplify', 'visvalingam', '8%', 'keep-shapes',
    '-filter-islands', 'min-area=2000km2', '-o', out, 'format=geojson', 'precision=0.01',
  ], { stdio: 'ignore' });
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`${kb} KB`);
  recs.push({
    id: `${MODEL.toLowerCase()}-${age}`,
    age: { ma: age },
    model: MODEL,
    layer: 'coastlines',
    file: `paleogeo/${MODEL.toLowerCase()}-${age}.json`,
    sourceUrl: url,
    generatedWith: 'GPlates Web Service (gws.gplates.org) + mapshaper',
    generatedAt,
    simplification: 'Visvalingam 8%, precisão 0,01°, ilhas < 2000 km² removidas',
    confidence: age <= 250 ? 'well_supported' : age <= 540 ? 'debated' : 'speculative',
    refs: ['merdith-2021', 'merdith-2021-data'],
  });
}
rmSync(tmp, { recursive: true, force: true });

writeFileSync(join(root, 'src', 'data', 'paleogeo', 'reconstructions.json'), JSON.stringify({
  model: MODEL,
  modelName: 'Merdith et al. (2021) — modelo de placas completo 1000–0 Ma',
  layerDescription: 'Contornos de linha de costa atuais reposicionados pelo modelo de placas. NÃO são as linhas de costa da época: o nível do mar e a forma dos continentes eram diferentes.',
  modelVersion: 'v1.2.4 (Zenodo 10.5281/zenodo.13635864)',
  license: 'CC-BY-4.0',
  licenseNote: 'Arquivos do modelo sob CC BY 4.0 (Zenodo). Os instantâneos foram gerados pelo GPlates Web Service (EarthByte, Univ. de Sydney; software GPL-2.0, sem termos de uso próprios para os resultados) e modificados aqui: simplificados e com ilhas pequenas removidas. Atribuição obrigatória.',
  attribution: 'Paleogeografia: Merdith et al. (2021), modelo de placas v1.2.4. Gerado via GPlates Web Service (EarthByte) e simplificado.',
  licenseCheckedAt: '2026-11-20',
  limitations: [
    'Antes de ~540 Ma a posição dos continentes tem incerteza crescente; antes de ~1000 Ma não há reconstrução.',
    'Neste modelo, a longitude das placas não é restringida (referencial paleomagnético): a posição leste–oeste dos continentes é convencional.',
  ],
  snapshots: recs,
}, null, 2) + '\n');
console.log(`✓ ${recs.length} instantâneos gerados.`);
