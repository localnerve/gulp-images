/**
 * Tests for transform/toWebp — @localnerve/gulp-images
 *
 * webp encoder options ref:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initWasmModules } from '../src/utils.js';
import { toWebp } from '../src/transform/index.js';
import { vinylFile, pipeFile } from './helpers.js';

// Initialize WASM once for all toWebp tests
before(async () => {
  await initWasmModules();
});

// WebP magic bytes: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
//                  R  I  F  F                 W  E  B  P
function isWebP(buf) {
  return (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  );
}

describe('transform/toWebp', () => {
  // ── JPEG → WebP ────────────────────────────────────────────────────────────
  describe('converting a JPEG file', () => {
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.jpg');
      originalSize = file.contents.length;

      const transform = toWebp({
        webpOptions: {
          quality: 75,
          method: 4,
          sns_strength: 50,
          filter_strength: 60,
          filter_sharpness: 0,
          filter_type: 1,
          lossless: 0,
          use_sharp_yuv: 0,
          alpha_quality: 100
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .webp extension', () => {
      assert.equal(result.extname, '.webp', `expected .webp, got ${result.extname}`);
    });

    it('output contains valid WebP magic bytes', () => {
      assert.ok(isWebP(result.contents), 'output should start with RIFF....WEBP');
    });

    it('produces a non-empty buffer', () => {
      assert.ok(result.contents.length > 0, 'output buffer must not be empty');
    });

    it('produces output smaller than the quality-92 source JPEG', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected webp (${result.contents.length}) < source jpeg (${originalSize})`
      );
    });
  });

  // ── PNG → WebP ─────────────────────────────────────────────────────────────
  describe('converting a PNG file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.png');
      const transform = toWebp({ webpOptions: { quality: 75, lossless: 0 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .webp extension', () => {
      assert.equal(result.extname, '.webp');
    });

    it('output contains valid WebP magic bytes', () => {
      assert.ok(isWebP(result.contents), 'output should start with RIFF....WEBP');
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
      const transform = toWebp({ webpOptions: { quality: 75 } }, localOutput);
      result = await pipeFile(transform, file);

      // Store mutated output back so assertions below can inspect it
      output['hero-main']['800'] = localOutput['hero-main']['800'];
    });

    after(() => {
      // Make sure the main output still worked
      assert.equal(result.extname, '.webp');
      assert.ok(isWebP(result.contents), 'output should start with RIFF....WEBP');
    });

    it('updates basename to .webp in the output object', () => {
      assert.ok(
        output['hero-main']['800'].basename.endsWith('.webp'),
        `expected .webp basename, got ${output['hero-main']['800'].basename}`
      );
    });

    it('updates mimeType to image/webp in the output object', () => {
      assert.equal(output['hero-main']['800'].mimeType, 'image/webp');
    });
  });

  // ── no output argument ─────────────────────────────────────────────────────
  describe('when output is not provided', () => {
    it('still converts JPEG to WebP without throwing', async () => {
      const file = await vinylFile('sample.jpg');
      const transform = toWebp({ webpOptions: { quality: 75 } }); // no output
      const result = await pipeFile(transform, file);
      assert.equal(result.extname, '.webp');
      assert.ok(isWebP(result.contents));
    });
  });

  // ── skip non-raster ────────────────────────────────────────────────────────
  describe('when the file is an SVG (unsupported format)', () => {
    it('passes SVG files through unchanged', async () => {
      const file = await vinylFile('sample.svg');
      const originalSize = file.contents.length;
      const transform = toWebp({ webpOptions: { quality: 75 } });
      const result = await pipeFile(transform, file);
      assert.equal(result.contents.length, originalSize, 'SVG should pass through unchanged');
      assert.equal(result.extname, '.svg');
    });
  });
});
