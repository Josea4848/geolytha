// Curva de diversidade de gêneros de animais marinhos por idade (stage) do Fanerozoico, a partir do PBDB.
// Contagem "range-through" (Foote 2000: X_FT + X_bL + X_Ft + X_bt). Não padronizada por amostragem.
// Uso: node scripts/fetch-diversity.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'https://paleobiodb.org/data1.2/occs/diversity.json?base_name=Animalia&count=genera&time_reso=stage&interval=Fortunian,Holocene&envtype=marine';
const r = await fetch(url);
if (!r.ok) throw new Error(`HTTP ${r.status}`);
const recs = (await r.json()).records;
const bins = recs
  .map((b) => ({ name: b.nam, start: +b.eag, end: +b.lag, genera: +b.xft + +b.xbl + +b.xfl + +b.xbt, sampled: +b.dsb }))
  .sort((a, b) => b.start - a.start);
writeFileSync(join(root, 'src/data/diversity/marine-genera.json'), JSON.stringify({
  title: 'Gêneros de animais marinhos por idade (Fanerozoico)',
  source: 'Paleobiology Database, occs/diversity (count=genera, time_reso=stage, envtype=marine)',
  sourceUrl: url,
  license: 'CC0-1.0',
  fetchedAt: new Date().toISOString().slice(0, 10),
  method: 'Contagem range-through (X_FT + X_bL + X_Ft + X_bt). Dados brutos, sem padronização por esforço de amostragem: a forma da curva reflete também quanto cada intervalo foi estudado.',
  refs: ['pbdb'],
  bins,
}, null, 1) + '\n');
console.log(`✓ ${bins.length} intervalos`);
