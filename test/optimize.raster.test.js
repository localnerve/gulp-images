/**
 * Tests for optimize/jpeg and optimize/png — @localnerve/gulp-images
 *
 * mozjpeg options ref: https://github.com/jamsinclair/jSquash/blob/main/packages/jpeg/meta.ts
 * oxipng options ref:  https://github.com/jamsinclair/jSquash/blob/main/packages/oxipng/meta.ts
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initWasmModules } from '../src/utils.js';
import { jpeg, png } from '../src/optimize/index.js';
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
