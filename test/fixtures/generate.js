#!/usr/bin/env node
/**
 * Generate test fixture image files using sharp (already a transitive dep).
 * Run once: node test/fixtures/generate.js
 *
 * Creates:
 *   test/fixtures/img/sample.svg       — compact SVG (no indentation)
 *   test/fixtures/img/sample.jpg       — 200×200 JPEG
 *   test/fixtures/img/sample.png       — 200×200 PNG
 *   test/fixtures/img/hero-main-800.jpg — 800px wide JPEG (responsive naming)
 *   test/fixtures/img/hero-main-800.png — 800px wide PNG  (responsive naming)
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import sharp from '/Users/agrant/projects/gulp-images/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'img');

await fs.mkdir(OUT, { recursive: true });

// ── SVG ──────────────────────────────────────────────────────────────────────
// Deliberately compact / no pretty-print so the svg test can confirm file size
// GROWS when svgo is run with { js2svg: { indent: 4, pretty: true } }.
const svgContent =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
  '<circle cx="100" cy="100" r="80" fill="#4a90e2"/>' +
  '<rect x="40" y="40" width="120" height="120" fill="none" stroke="#fff" stroke-width="4"/>' +
  '<text x="100" y="110" text-anchor="middle" fill="#fff" font-size="24">test</text>' +
  '</svg>';
await fs.writeFile(path.join(OUT, 'sample.svg'), svgContent, 'utf8');
console.log('✔ sample.svg written (%d bytes)', svgContent.length);

// ── helper: gradient PNG buffer via sharp ─────────────────────────────────────
async function makeImage(width, height, label) {
  // Build a simple coloured image with text via SVG→raster
  const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a90e2"/>
      <stop offset="100%" stop-color="#7b68ee"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="#fff" stroke-width="4"/>
  <text x="${width / 2}" y="${height / 2 + 10}" text-anchor="middle" font-size="32"
        font-family="sans-serif" font-weight="bold" fill="#fff">${label}</text>
</svg>`;
  return sharp(Buffer.from(svgSrc));
}

// ── JPEG fixtures ─────────────────────────────────────────────────────────────
const jpeg200 = await makeImage(200, 200, 'JPEG');
await jpeg200.jpeg({ quality: 92 }).toFile(path.join(OUT, 'sample.jpg'));
console.log('✔ sample.jpg');

const jpeg800 = await makeImage(800, 600, 'JPEG 800');
await jpeg800.jpeg({ quality: 92 }).toFile(path.join(OUT, 'hero-main-800.jpg'));
console.log('✔ hero-main-800.jpg');

// ── PNG fixtures ──────────────────────────────────────────────────────────────
const png200 = await makeImage(200, 200, 'PNG');
await png200.png({ compressionLevel: 1 }).toFile(path.join(OUT, 'sample.png'));
console.log('✔ sample.png');

const png800 = await makeImage(800, 600, 'PNG 800');
await png800.png({ compressionLevel: 1 }).toFile(path.join(OUT, 'hero-main-800.png'));
console.log('✔ hero-main-800.png');

console.log('\nAll fixtures written to', OUT);
