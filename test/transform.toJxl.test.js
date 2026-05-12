/**
 * Tests for transform/toJxl — @localnerve/gulp-images
 *
 * jxl encoder options ref:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/jxl/meta.ts
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initWasmModules } from '../src/utils.js';
import { toJxl } from '../src/transform/index.js';
import { vinylFile, pipeFile } from './helpers.js';

// Initialize WASM once for all toAvif tests
before(async () => {
  await initWasmModules();
});

// jxl magic bytes test
//
function isJxl(bytes) {
  // Option A: Naked Codestream
  const isCodestream = bytes[0] === 0xFF && bytes[1] === 0x0A;

  // Option B: ISOBMFF Container ('JXL ' signature)
  const isContainer = bytes[4] === 0x4A && // 'J'
    bytes[5] === 0x58 && // 'X'
    bytes[6] === 0x4C && // 'L'
    bytes[7] === 0x20;   // ' '

  return isCodestream || isContainer;
}

describe('transform/toJxl', () => {
  // ── JPEG → Jxl ────────────────────────────────────────────────────────────
  describe('converting a JPEG file', () => {
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.jpg');
      originalSize = file.contents.length;

      const transform = toJxl({
        JxlOptions: {
          quality: 75
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .jxl extension', () => {
      assert.equal(result.extname, '.jxl', `expected .jxl, got ${result.extname}`);
    });

    it('output contains valid Jxl magic bytes', () => {
      assert.ok(isJxl(result.contents), 'output should start with valid JXL byte sequence');
    });

    it('produces a non-empty buffer', () => {
      assert.ok(result.contents.length > 0, 'output buffer must not be empty');
    });

    it('produces output smaller than the source JPEG', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected jxl (${result.contents.length}) < source jpeg (${originalSize})`
      );
    });
  });

  // ── PNG → jxl ─────────────────────────────────────────────────────────────
  describe('converting a PNG file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.png');
      const transform = toJxl({ jxlOptions: { quality: 75 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .jxl extension', () => {
      assert.equal(result.extname, '.jxl');
    });

    it('output contains valid Jxl magic bytes', () => {
      assert.ok(isJxl(result.contents), 'output should start with valid Jxl byte sequence');
    });
  });

  // ── Webp → Jxl ─────────────────────────────────────────────────────────────
  describe('converting a WEBP file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.webp');
      const transform = toJxl({ jxlOptions: { quality: 75 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .jxl extension', () => {
      assert.equal(result.extname, '.jxl');
    });

    it('output contains valid Jxl magic bytes', () => {
      assert.ok(isJxl(result.contents), 'output should start with valid Jxl byte sequence');
    });
  });

  // ── Avif → Jxl ─────────────────────────────────────────────────────────────
  describe('converting a AVIF file', () => {
    let result;

    before(async () => {
      const file = await vinylFile('sample.avif');
      const transform = toJxl({ jxlOptions: { quality: 75 } });
      result = await pipeFile(transform, file);
    });

    it('returns a file with .jxl extension', () => {
      assert.equal(result.extname, '.jxl');
    });

    it('output contains valid Jxl magic bytes', () => {
      assert.ok(isJxl(result.contents), 'output should start with valid Jxl byte sequence');
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
      const transform = toJxl({ jxlOptions: { quality: 75 } }, localOutput);
      result = await pipeFile(transform, file);

      // Store mutated output back so assertions below can inspect it
      output['hero-main']['800'] = localOutput['hero-main']['800'];
    });

    after(() => {
      // Make sure the main output still worked
      assert.equal(result.extname, '.jxl');
      assert.ok(isJxl(result.contents), 'output should start with valid Jxl byte sequence');
    });

    it('updates basename to .jxl in the output object', () => {
      assert.ok(
        output['hero-main']['800'].basename.endsWith('.jxl'),
        `expected .jxl basename, got ${output['hero-main']['800'].basename}`
      );
    });

    it('updates mimeType to image/jxl in the output object', () => {
      assert.equal(output['hero-main']['800'].mimeType, 'image/jxl');
    });
  });

  // ── no output argument ─────────────────────────────────────────────────────
  describe('when output is not provided', () => {
    it('still converts JPEG to Avif without throwing', async () => {
      const file = await vinylFile('sample.jpg');
      const transform = toJxl({ avifOptions: { quality: 75 } }); // no output
      const result = await pipeFile(transform, file);
      assert.equal(result.extname, '.jxl');
      assert.ok(isJxl(result.contents));
    });
  });

  // ── skip non-raster ────────────────────────────────────────────────────────
  describe('when the file is an SVG (unsupported format)', () => {
    it('passes SVG files through unchanged', async () => {
      const file = await vinylFile('sample.svg');
      const originalSize = file.contents.length;
      const transform = toJxl({ avifOptions: { quality: 75 } });
      const result = await pipeFile(transform, file);
      assert.equal(result.contents.length, originalSize, 'SVG should pass through unchanged');
      assert.equal(result.extname, '.svg');
    });
  });
});
