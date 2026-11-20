import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateData } from '../src/domain/validate';

const load = (p: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../src/data/${p}`, import.meta.url)), 'utf8'));

const errors = validateData({
  intervals: load('chronology/intervals.json'),
  meta: load('chronology/meta.json'),
  events: load('events/events.json'),
  references: load('references/references.json'),
  reconstructions: load('paleogeo/reconstructions.json'),
  taxa: load('taxa/taxa.json'),
  media: load('media/media.json'),
  diversity: load('diversity/marine-genera.json'),
  climate: load('climate/gmst-scotese.json'),
  texts: load('taxa/texts.json'),
  fileExists: (rel) => existsSync(fileURLToPath(new URL(`../public/${rel}`, import.meta.url))),
});

if (errors.length) {
  console.error(`✗ ${errors.length} erro(s) nos dados:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✓ Dados válidos (esquemas, referências, hierarquia e cobertura temporal).');
