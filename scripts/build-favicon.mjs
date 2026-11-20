// Gera favicon.ico (16, 32, 48 px) e apple-touch-icon.png a partir de public/favicon.svg.
// O .ico usa imagens PNG embutidas (formato aceito por todos os navegadores atuais).
// Uso: node scripts/build-favicon.mjs   (requer a dependência de desenvolvimento "sharp")
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = readFileSync(join(pub, 'favicon.svg'));
const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));

// cabeçalho ICONDIR (6 bytes) + 16 bytes por imagem + dados PNG
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo: ícone
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); // largura, altura
  e.writeUInt8(0, 2); e.writeUInt8(0, 3); // paleta, reservado
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); // planos, bits por pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]));
writeFileSync(join(pub, 'apple-touch-icon.png'), await sharp(svg, { density: 384 }).resize(180, 180).png().toBuffer());
console.log('✓ favicon.ico (16/32/48) e apple-touch-icon.png');
