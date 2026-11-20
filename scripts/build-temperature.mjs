// Temperatura média global (GMST) do Fanerozoico a partir dos mapas de Scotese (Zenodo 10.5281/zenodo.8238875, CC BY 4.0).
// 1) Baixe gmst_scotese02a_v21321_csv-grid.zip do Zenodo e extraia numa pasta.
// 2) node scripts/build-temperature.mjs <pasta-com-os-100-csv>
// Cada CSV é uma grade 1°×1° (181 linhas de 90°N a 90°S, 361 colunas de 180°W a 180°E, a última repete a primeira).
// A média global é ponderada pela área (cosseno da latitude). As duas primeiras células da 1ª linha não são
// temperaturas (vêm como "50.0,-55.0" em todos os arquivos) e são ignoradas.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir) throw new Error('informe a pasta com os CSV extraídos');

const series = readdirSync(dir).filter((f) => /^\d{3}_temp\.csv$/.test(f)).sort().map((f) => {
  const rows = readFileSync(join(dir, f), 'utf8').trim().split(/\r?\n/);
  let num = 0, den = 0;
  rows.forEach((r, i) => {
    const w = Math.cos(((90 - i) * Math.PI) / 180);
    const v = r.split(',').map(Number).slice(i === 0 ? 2 : 0, 360);
    num += w * (v.reduce((a, b) => a + b, 0) / v.length);
    den += w;
  });
  return { ma: Number(f.slice(0, 3)), gmst: Math.round((num / den) * 10) / 10 };
});

writeFileSync(join(root, 'src/data/climate/gmst-scotese.json'), JSON.stringify({
  title: 'Temperatura média global da superfície (°C)',
  source: 'Scotese (2021), Global Mean Surface Temperatures for 100 Phanerozoic Time Intervals, v scotese02a_v21321',
  sourceUrl: 'https://doi.org/10.5281/zenodo.8238875',
  license: 'CC-BY-4.0',
  method: 'Média ponderada pela área calculada neste projeto a partir das grades 1°×1° do conjunto de dados. Os mapas vêm de simulações HadCM3L ajustadas a dados de δ18O e a indicadores litológicos de clima.',
  caveats: [
    'O conjunto de dados não traz faixa de incerteza; os valores são estimativas de modelo e não medições.',
    'Outras reconstruções chegam a valores diferentes, em geral mais quentes (ex.: Judd et al. 2024).',
    'Valores isolados muito baixos (65 Ma e 445 Ma) vêm do próprio conjunto de dados; ver a publicação original para a interpretação.',
  ],
  builtAt: new Date().toISOString().slice(0, 10),
  refs: ['scotese-2021', 'scotese-gmst-data', 'judd-2024'],
  series,
}, null, 1) + '\n');
console.log(`✓ ${series.length} valores`);
