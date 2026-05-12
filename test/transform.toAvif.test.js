/**
 * Tests for transform/toAvif — @localnerve/gulp-images
 *
 * avif encoder options ref:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/avif/meta.ts
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initWasmModules } from '../src/utils.js';
import { toAvif } from '../src/transform/index.js';
import { vinylFile, pipeFile } from './helpers.js';

// Initialize WASM once for all toAvif tests
before(async () => {
  await initWasmModules();
});

// Avif magic bytes: ?? ?? ?? ?? 66 74 79 70 61 76 69 66
//                               F  T  Y  P  A  V  I  F
function isAvif(buf) {
  return (
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
    buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x66
  );
}

describe('transform/toAvif', () => {
  // ── JPEG → Avif ────────────────────────────────────────────────────────────
  describe('converting a JPEG file', () => {
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.jpg');
      originalSize = file.contents.length;

      const transform = toAvif({
        avifOptions: {
          quality: 75,
          speed: 1,
          lossless: 0
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .avif extension', () => {
      assert.equal(result.extname, '.avif', `expected .avif, got ${result.extname}`);
    });

    it('output contains valid Avif magic bytes', () => {
      assert.ok(isAvif(result.contents), 'output should start with ....FTYPAVIF');
    });

    it('produces a non-empty buffer', () => {
      assert.ok(result.contents.length > 0, 'output buffer must not be empty');
    });

    it('produces output smaller than the source JPEG', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected avif (${result.contents.length}) < source jpeg (${originalSize})`
      );
    });
  });

  // ── PNG → Avif ─────────────────────────────────────────────────────────────
  describe('converting a PNG file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.png');
      const transform = toAvif({ avifOptions: { quality: 75, speed: 1 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .avif extension', () => {
      assert.equal(result.extname, '.avif');
    });

    it('output contains valid Avif magic bytes', () => {
      assert.ok(isAvif(result.contents), 'output should start with ....FTYPAVIF');
    });
  });

  // ── WEBP → Avif ─────────────────────────────────────────────────────────────
  describe('converting a WEBP file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.webp');
      const transform = toAvif({ avifOptions: { quality: 75, speed: 9 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .avif extension', () => {
      assert.equal(result.extname, '.avif');
    });

    it('output contains valid Avif magic bytes', () => {
      assert.ok(isAvif(result.contents), 'output should start with ....FTYPAVIF');
    });
  });

  // ── JXL → Avif ─────────────────────────────────────────────────────────────
  describe('converting a JXL file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.jxl');
      const transform = toAvif({ avifOptions: { quality: 75, speed: 9 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .avif extension', () => {
      assert.equal(result.extname, '.avif');
    });

    it('output contains valid Avif magic bytes', () => {
      assert.ok(isAvif(result.contents), 'output should start with ....FTYPAVIF');
    });
  });

  // ── output metadata ────────────────────────────────────────────────────────
  describe('output metadata update', () => {
    // File uses the key-sub-width naming convention: hero-main-800.jpg
    // → key = 'hero-main', width = '800'
    let result;
    const output = {
      'hero-main': {
        '800': { basename: 'hero-main-800.jpg', mimeType: 'image/jpeg' }
      }
    };

    before(async () => {
      // Clone the output to avoid cross-test contamination
      const localOutput = JSON.parse(JSON.stringify(output));
      const file = await vinylFile('hero-main-800.jpg');
      const transform = toAvif({ avifOptions: { quality: 75 } }, localOutput);
      result = await pipeFile(transform, file);

      // Store mutated output back so assertions below can inspect it
      output['hero-main']['800'] = localOutput['hero-main']['800'];
    });

    after(() => {
      // Make sure the main output still worked
      assert.equal(result.extname, '.avif');
      assert.ok(isAvif(result.contents), 'output should start with ....FTYPAVIF');
    });

    it('updates basename to .avif in the output object', () => {
      assert.ok(
        output['hero-main']['800'].basename.endsWith('.avif'),
        `expected .avif basename, got ${output['hero-main']['800'].basename}`
      );
    });

    it('updates mimeType to image/avif in the output object', () => {
      assert.equal(output['hero-main']['800'].mimeType, 'image/avif');
    });
  });

  // ── no output argument ─────────────────────────────────────────────────────
  describe('when output is not provided', () => {
    it('still converts JPEG to Avif without throwing', async () => {
      const file = await vinylFile('sample.jpg');
      const transform = toAvif({ avifOptions: { quality: 75 } }); // no output
      const result = await pipeFile(transform, file);
      assert.equal(result.extname, '.avif');
      assert.ok(isAvif(result.contents));
    });
  });

  // ── skip non-raster ────────────────────────────────────────────────────────
  describe('when the file is an SVG (unsupported format)', () => {
    it('passes SVG files through unchanged', async () => {
      const file = await vinylFile('sample.svg');
      const originalSize = file.contents.length;
      const transform = toAvif({ avifOptions: { quality: 75 } });
      const result = await pipeFile(transform, file);
      assert.equal(result.contents.length, originalSize, 'SVG should pass through unchanged');
      assert.equal(result.extname, '.svg');
    });
  });
});
