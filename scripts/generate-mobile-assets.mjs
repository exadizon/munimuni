// Generates Expo mobile assets from the pen-star brand mark (matches web PWA).
// Run: node scripts/generate-mobile-assets.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const assetsDir = path.join(root, 'apps', 'mobile', 'assets');
await mkdir(assetsDir, { recursive: true });

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

// Rounded tile on transparent (splash image + notification-style icon)
const tile = (size, tileFrac = 0.72) => {
  const t = size * tileFrac;
  const o = (size - t) / 2;
  const rx = t * 0.25;
  const glyphScale = (t * 0.72) / 24;
  const go = (t - 24 * glyphScale) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><g transform="translate(${o}, ${o})"><rect width="${t}" height="${t}" rx="${rx}" fill="#1d221e"/><g transform="translate(${go}, ${go}) scale(${glyphScale})">${PEN}</g></g></svg>`,
  );
};

const jobs = [
  // App launcher icon (1024, full-bleed so launchers can mask it)
  sharp(fullBleed(1024), { density: 200 }).resize(1024, 1024).png()
    .toFile(path.join(assetsDir, 'icon.png')),
  // Android adaptive foreground (safe-zone padding)
  sharp(fullBleed(1024, 0.6), { density: 200 }).resize(1024, 1024).png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png')),
  // Splash image: rounded tile, centered by Expo on #151916
  sharp(tile(512), { density: 200 }).resize(512, 512).png()
    .toFile(path.join(assetsDir, 'splash-icon.png')),
  // Web PWA favicon
  sharp(fullBleed(48), { density: 200 }).resize(48, 48).png()
    .toFile(path.join(assetsDir, 'favicon.png')),
];

await Promise.all(jobs.map((p, i) => p.then(() => console.log(['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'favicon.png'][i]))));
console.log('done');
