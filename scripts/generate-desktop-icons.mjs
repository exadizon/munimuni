// Regenerates Tauri desktop icons from the pen-star brand mark (matches web PWA).
// Run: node scripts/generate-desktop-icons.mjs
// Requires: sharp (via Next dep) + Python PIL for .ico/.icns
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const iconsDir = path.join(root, 'apps', 'desktop', 'src-tauri', 'icons');

const PEN = `
    <path d="M13.2 18.2L8.5 20.2L9.6 15.5L17.2 4.2C17.9 3.2 19.3 3.2 20.1 4C20.9 4.8 20.9 6.2 19.9 6.9L13.2 18.2Z" stroke="#e3b66d" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M9.6 15.5L13.6 17.2" stroke="#e3b66d" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <circle cx="13.2" cy="12.2" r="0.9" fill="#e3b66d"/>
    <path d="M13.2 12.2L8.8 19.2" stroke="#e3b66d" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M5 8.5C5 6.5 4 5.5 2 5.5C4 5.5 5 4.5 5 2.5C5 4.5 6 5.5 8 5.5C6 5.5 5 6.5 5 8.5Z" fill="#f1eee5"/>
    <path d="M21.5 17.5C21.5 16.2 20.8 15.5 19.5 15.5C20.8 15.5 21.5 14.8 21.5 13.5C21.5 14.8 22.2 15.5 23.5 15.5C22.2 15.5 21.5 16.2 21.5 17.5Z" fill="#f1eee5"/>`;

const fullBleed = (size, frac = 0.66) => {
  const logo = size * frac;
  const scale = logo / 24;
  const o = (size - logo) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#151916"/><g transform="translate(${o}, ${o}) scale(${scale})">${PEN}</g></svg>`,
  );
};

const targets = new Map([
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['icon.png', 512],
  ['Square30x30Logo.png', 30],
  ['Square44x44Logo.png', 44],
  ['Square71x71Logo.png', 71],
  ['Square89x89Logo.png', 89],
  ['Square107x107Logo.png', 107],
  ['Square142x142Logo.png', 142],
  ['Square150x150Logo.png', 150],
  ['Square284x284Logo.png', 284],
  ['Square310x310Logo.png', 310],
  ['StoreLogo.png', 50],
]);

for (const [file, size] of targets) {
  await sharp(fullBleed(size), { density: 200 }).resize(size, size).png()
    .toFile(path.join(iconsDir, file));
  console.log(`wrote ${file}`);
}

// Master 1024 for ico/icns conversion via PIL.
const master = path.join(iconsDir, '.icon-master-1024.png');
await sharp(fullBleed(1024), { density: 200 }).resize(1024, 1024).png().toFile(master);

const python = process.env.PYTHON ?? 'C:\\Users\\exequel\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
const py = `
from PIL import Image
import os
d = ${JSON.stringify(iconsDir)}
master = os.path.join(d, '.icon-master-1024.png')
img = Image.open(master).convert('RGBA')
img.save(os.path.join(d, 'icon.ico'), sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('wrote icon.ico')
img.save(os.path.join(d, 'icon.icns'))
print('wrote icon.icns')
os.remove(master)
`;
execFileSync(python, ['-c', py], { stdio: 'inherit' });
console.log('done');
