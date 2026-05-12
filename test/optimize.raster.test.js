/**
 * Tests for optimize/jpeg and optimize/png — @localnerve/gulp-images
 *
 * mozjpeg options ref: https://github.com/jamsinclair/jSquash/blob/main/packages/jpeg/meta.ts
 * oxipng options ref:  https://github.com/jamsinclair/jSquash/blob/main/packages/oxipng/meta.ts
 * avif options ref: https://github.com/jamsinclair/jSquash/blob/main/packages/avif/meta.ts
 * jxl options ref: https://github.com/jamsinclair/jSquash/blob/main/packages/jxl/meta.ts
 * webp options ref: https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initWasmModules } from '../src/utils.js';
import { avif, jpeg, jxl, png, webp } from '../src/optimize/index.js';
import { vinylFile, pipeFile } from './helpers.js';

// WASM modules are shared — initialize once for all raster tests
before(async () => {
  await initWasmModules();
});

// ── JPEG ─────────────────────────────────────────────────────────────────────
describe('optimize/jpeg', () => {
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = jpeg({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file must be unchanged in non-prod mode');
      assert.equal(result.extname, '.jpg');
    });
  });

  describe('when prod is true with quality:60 mozjpeg options', () => {
    // mozjpeg default quality is 75; using 60 should produce a smaller file.
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.jpg');
      originalSize = file.contents.length;

      const transform = jpeg({
        prod: true,
        mozjpegOptions: {
          quality: 60,
          progressive: true,
          optimize_coding: true,
          auto_subsample: true,
          chroma_subsample: 2,
          trellis_multipass: false,
          trellis_opt_zero: false,
          trellis_opt_table: false,
          trellis_loops: 1,
          baseline: false,
          arithmetic: false,
          smoothing: 0
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .jpg extension', () => {
      assert.equal(result.extname, '.jpg');
    });

    it('produces a buffer (non-empty output)', () => {
      assert.ok(result.contents.length > 0, 'output must not be empty');
    });

    it('produces output smaller than the source (quality 60 < quality 92 source)', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected optimized size (${result.contents.length}) < original (${originalSize})`
      );
    });

    it('output begins with JPEG magic bytes FF D8', () => {
      assert.equal(result.contents[0], 0xFF);
      assert.equal(result.contents[1], 0xD8);
    });
  });

  describe('when the file is not a JPEG', () => {
    it('passes non-jpeg files through unchanged', async () => {
      const file = await vinylFile('sample.png');
      const originalSize = file.contents.length;

      const transform = jpeg({ prod: true, mozjpegOptions: { quality: 60 } });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-jpeg file should not be touched');
    });
  });
});

// ── PNG ──────────────────────────────────────────────────────────────────────
describe('optimize/png', () => {
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.png');
      const originalSize = file.contents.length;

      const transform = png({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file must be unchanged in non-prod mode');
      assert.equal(result.extname, '.png');
    });
  });

  describe('when prod is true with oxipng options (level 4)', () => {
    // The fixture PNG was written with compressionLevel: 1 (low compression)
    // so oxipng level 4 should produce a smaller output.
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.png');
      originalSize = file.contents.length;

      const transform = png({
        prod: true,
        oxipngOptions: {
          level: 4,           // 0–6; higher = more aggressive
          interlace: false,
          optimiseAlpha: true
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .png extension', () => {
      assert.equal(result.extname, '.png');
    });

    it('produces a non-empty output buffer', () => {
      assert.ok(result.contents.length > 0, 'output must not be empty');
    });

    it('produces output smaller than the lightly-compressed source', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected optimized size (${result.contents.length}) < original (${originalSize})`
      );
    });

    it('output begins with PNG magic bytes 89 50 4E 47', () => {
      assert.equal(result.contents[0], 0x89);
      assert.equal(result.contents[1], 0x50); // 'P'
      assert.equal(result.contents[2], 0x4E); // 'N'
      assert.equal(result.contents[3], 0x47); // 'G'
    });
  });

  describe('when the file is not a PNG', () => {
    it('passes non-png files through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = png({ prod: true, oxipngOptions: { level: 2 } });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-png file should not be touched');
    });
  });
});

// ── AVIF ──────────────────────────────────────────────────────────────────────
describe('optimize/avif', () => {
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.avif');
      const originalSize = file.contents.length;

      const transform = avif({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file must be unchanged in non-prod mode');
      assert.equal(result.extname, '.avif');
    });
  });

  describe('when prod is true with avif optimizations (speed 1)', () => {
    // The fixture AVIF was written with speed: 10
    // so avif speed level 1 should produce a smaller output.
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.avif');
      originalSize = file.contents.length;

      const transform = avif({
        prod: true,
        avifOptions: {
          speed: 1           // 0-3; smallest file, high quality
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .png extension', () => {
      assert.equal(result.extname, '.avif');
    });

    it('produces a non-empty output buffer', () => {
      assert.ok(result.contents.length > 0, 'output must not be empty');
    });

    it('produces output smaller than the lightly-compressed source', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected optimized size (${result.contents.length}) < original (${originalSize})`
      );
    });

    it('output begins with AVIF magic bytes at offset 4', () => {
      // Offset 4: 0x66 0x74 0x79 0x70 ('ftyp')
      assert.strictEqual(result.contents[4], 0x66);
      assert.strictEqual(result.contents[5], 0x74);
      assert.strictEqual(result.contents[6], 0x79);
      assert.strictEqual(result.contents[7], 0x70);

      // Offset 8: 0x61 0x76 0x69 0x66 ('avif')
      assert.strictEqual(result.contents[8], 0x61);
      assert.strictEqual(result.contents[9], 0x76);
      assert.strictEqual(result.contents[10], 0x69);
      assert.strictEqual(result.contents[11], 0x66);
    });
  });

  describe('when the file is not a AVIF', () => {
    it('passes non-avif files through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = avif({ prod: true, avifOptions: { speed: 1 } });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-avif file should not be touched');
    });
  });
});

// ── WEBP ──────────────────────────────────────────────────────────────────────
describe('optimize/webp', () => {
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.webp');
      const originalSize = file.contents.length;

      const transform = webp({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file must be unchanged in non-prod mode');
      assert.equal(result.extname, '.webp');
    });
  });

  describe('when prod is true with webp optimizations (quality: 50, lossless: true)', () => {
    // The fixture WEBP was written with quality: 99, lossless: false
    // so webp optimizations here should produce a smaller output.
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.webp');
      originalSize = file.contents.length;

      const transform = webp({
        prod: true,
        webpOptions: {
          quality: 50
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .png extension', () => {
      assert.equal(result.extname, '.webp');
    });

    it('produces a non-empty output buffer', () => {
      assert.ok(result.contents.length > 0, 'output must not be empty');
    });

    it('produces output smaller than the lightly-compressed source', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected optimized size (${result.contents.length}) < original (${originalSize})`
      );
    });

    it('output begins with WebP magic bytes', () => {
      // Offset 0-3: 'RIFF' (0x52 0x49 0x46 0x46)
      assert.strictEqual(result.contents[0], 0x52);
      assert.strictEqual(result.contents[1], 0x49);
      assert.strictEqual(result.contents[2], 0x46);
      assert.strictEqual(result.contents[3], 0x46);

      // Offset 8-11: 'WEBP' (0x57 0x45 0x42 0x50)
      assert.strictEqual(result.contents[8], 0x57);
      assert.strictEqual(result.contents[9], 0x45);
      assert.strictEqual(result.contents[10], 0x42);
      assert.strictEqual(result.contents[11], 0x50);
    });
  });

  describe('when the file is not a WEBP', () => {
    it('passes non-webp files through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = webp({ prod: true, webpOptions: { quality: 50 } });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-webp file should not be touched');
    });
  });
});

// ── JXL ──────────────────────────────────────────────────────────────────────
describe('optimize/jxl', () => {
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.jxl');
      const originalSize = file.contents.length;

      const transform = jxl({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file must be unchanged in non-prod mode');
      assert.equal(result.extname, '.jxl');
    });
  });

  describe('when prod is true with webp optimizations (quality: 50)', () => {
    // The fixture JXL was written with quality: 90
    // so webp optimizations here should produce a smaller output.
    let result;
    let originalSize;

    before(async () => {
      const file = await vinylFile('sample.jxl');
      originalSize = file.contents.length;

      const transform = jxl({
        prod: true,
        jxlOptions: {
          quality: 50
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .png extension', () => {
      assert.equal(result.extname, '.jxl');
    });

    it('produces a non-empty output buffer', () => {
      assert.ok(result.contents.length > 0, 'output must not be empty');
    });

    it('produces output smaller than the lightly-compressed source', () => {
      assert.ok(
        result.contents.length < originalSize,
        `expected optimized size (${result.contents.length}) < original (${originalSize})`
      );
    });

    it('output begins with JXL magic bytes', () => {
      const bytes = result.contents;
      // Option A: Naked Codestream
      const isCodestream = bytes[0] === 0xFF && bytes[1] === 0x0A;

      // Option B: ISOBMFF Container ('JXL ' signature)
      const isContainer = bytes[4] === 0x4A && // 'J'
        bytes[5] === 0x58 && // 'X'
        bytes[6] === 0x4C && // 'L'
        bytes[7] === 0x20;   // ' '

      assert.ok(isCodestream || isContainer, 'Should be a valid JXL signature');
    });
  });

  describe('when the file is not a JXL', () => {
    it('passes non-jxl files through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = jxl({ prod: true, jxlOptions: { quality: 50 } });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-webp file should not be touched');
    });
  });
});
