// Generates PWA PNG assets from the pen-star SVG source.
// Run: node scripts/generate-pwa-assets.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const webPublic = path.join(root, 'apps', 'web', 'public');
const iconsDir = path.join(webPublic, 'icons');

const PEN_PATHS = `
    <path
      d="M13.2 18.2L8.5 20.2L9.6 15.5L17.2 4.2C17.9 3.2 19.3 3.2 20.1 4C20.9 4.8 20.9 6.2 19.9 6.9L13.2 18.2Z"
      stroke="#e3b66d" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"
    />
    <path d="M9.6 15.5L13.6 17.2" stroke="#e3b66d" stroke-width="1.5" stroke-linecap="round" fill="none" />
    <circle cx="13.2" cy="12.2" r="0.9" fill="#e3b66d" />
    <path d="M13.2 12.2L8.8 19.2" stroke="#e3b66d" stroke-width="1.4" stroke-linecap="round" fill="none" />
    <path d="M5 8.5C5 6.5 4 5.5 2 5.5C4 5.5 5 4.5 5 2.5C5 4.5 6 5.5 8 5.5C6 5.5 5 6.5 5 8.5Z" fill="#f1eee5" />
    <path d="M21.5 17.5C21.5 16.2 20.8 15.5 19.5 15.5C20.8 15.5 21.5 14.8 21.5 13.5C21.5 14.8 22.2 15.5 23.5 15.5C22.2 15.5 21.5 16.2 21.5 17.5Z" fill="#f1eee5" />`;

const glyph = (tx, ty, scale) => `<g transform="translate(${tx}, ${ty}) scale(${scale})">${PEN_PATHS}</g>`;

// Full-bleed square icon (no rounded corners, no transparency) for
// apple-touch-icon and maskable purposes. Logo centered with padding.
const fullBleedSvg = (size, logoScale) => {
  const logoSize = 24 * logoScale;
  const offset = (size - logoSize) / 2;
  const scale = logoScale / 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#151916"/>${glyph(offset, offset, scale)}</svg>`;
};

const splashSvg = (w, h) => {
  const units = 36; // 24-unit glyph + 6-unit padding each side
  const tileSize = Math.min(w, h) * 0.3;
  const scale = tileSize / units;
  const tx = (w - tileSize) / 2;
  const ty = h / 2 - tileSize / 2 - 40;
  const titleY = ty + tileSize + 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#151916"/><g transform="translate(${tx}, ${ty}) scale(${scale})"><rect width="36" height="36" rx="8" fill="#1d221e"/><g transform="translate(6, 6)">${PEN_PATHS}</g></g><text x="${w / 2}" y="${titleY}" text-anchor="middle" fill="#f1eee5" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${Math.round(Math.min(w, h) * 0.055)}">munimuni</text><text x="${w / 2}" y="${titleY + 34}" text-anchor="middle" fill="#bcc3b8" font-family="monospace" font-size="${Math.round(Math.min(w, h) * 0.022)}">A quiet place for your thoughts.</text></svg>`;
};

await mkdir(iconsDir, { recursive: true });

const jobs = [];
// Direct rasters of the rounded SVGs (any-purpose icons + favicons)
for (const [src, dest, size] of [
  ['icon-192.svg', 'icon-192.png', 192],
  ['icon-512.svg', 'icon-512.png', 512],
]) {
  const svg = await readFile(path.join(iconsDir, src));
  jobs.push(sharp(svg, { density: 300 }).resize(size, size).png().toFile(path.join(iconsDir, dest)).then(() => console.log(`wrote ${dest}`)));
}

// Maskable: full-bleed with 60% logo so nothing important is cropped.
jobs.push(
  sharp(Buffer.from(fullBleedSvg(512, 12.8)), { density: 200 }).resize(512, 512).png()
    .toFile(path.join(iconsDir, 'maskable-512.png')).then(() => console.log('wrote maskable-512.png')),
);
// Apple touch: full-bleed square 180 (iOS rounds it).
jobs.push(
  sharp(Buffer.from(fullBleedSvg(180, 5.25)), { density: 200 }).resize(180, 180).png()
    .toFile(path.join(webPublic, 'apple-touch-icon.png')).then(() => console.log('wrote apple-touch-icon.png')),
);
// Favicons
const icon32 = await readFile(path.join(iconsDir, 'icon-192.svg'));
jobs.push(sharp(icon32).resize(32, 32).png().toFile(path.join(webPublic, 'favicon-32x32.png')).then(() => console.log('wrote favicon-32x32.png')));
jobs.push(sharp(icon32).resize(16, 16).png().toFile(path.join(webPublic, 'favicon-16x16.png')).then(() => console.log('wrote favicon-16x16.png')));
// Screenshots for install UI / splash
await mkdir(path.join(webPublic, 'screenshots'), { recursive: true });
jobs.push(
  sharp(Buffer.from(splashSvg(720, 1280))).png()
    .toFile(path.join(webPublic, 'screenshots', 'narrow-720x1280.png')).then(() => console.log('wrote narrow screenshot')),
);
jobs.push(
  sharp(Buffer.from(splashSvg(1280, 720))).png()
    .toFile(path.join(webPublic, 'screenshots', 'wide-1280x720.png')).then(() => console.log('wrote wide screenshot')),
);

await Promise.all(jobs);
console.log('done');
