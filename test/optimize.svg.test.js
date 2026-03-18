/**
 * Tests for optimize/svg — @localnerve/gulp-images
 *
 * The fixture is a compact single-line SVG (~290 bytes).
 * The svgo options use { js2svg: { indent: 4, pretty: true } }, which causes
 * the output to be larger than the input — we assert this as proof the
 * transform ran and applied the options.
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { svg } from '../src/optimize/index.js';
import { vinylFile, pipeFile } from './helpers.js';

describe('optimize/svg', () => {
  // prod: false — pass-through
  describe('when prod is false', () => {
    it('passes the file through unchanged', async () => {
      const file = await vinylFile('sample.svg');
      const originalSize = file.contents.length;

      const transform = svg({ prod: false });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'file should be unchanged in non-prod mode');
      assert.equal(result.extname, '.svg');
    });
  });

  // prod: true, pretty: true — file should GROW (pretty-printing adds whitespace)
  describe('when prod is true with pretty-print options', () => {
    let file;
    let originalSize;
    let result;

    before(async () => {
      file = await vinylFile('sample.svg');
      originalSize = file.contents.length;

      const transform = svg({
        prod: true,
        svgoOptions: {
          // Deliberately increases file size to confirm options were applied
          js2svg: { indent: 4, pretty: true }
        }
      });
      result = await pipeFile(transform, file);
    });

    it('returns a Vinyl file with .svg extension', () => {
      assert.equal(result.extname, '.svg');
    });

    it('produces output larger than the compact input (pretty-print adds whitespace)', () => {
      assert.ok(
        result.contents.length > originalSize,
        `expected output (${result.contents.length} bytes) to be larger than input (${originalSize} bytes)`
      );
    });

    it('output is valid UTF-8 XML starting with <svg', () => {
      const text = result.contents.toString('utf8').trim();
      assert.ok(text.startsWith('<svg'), `expected SVG output, got: ${text.slice(0, 40)}`);
    });
  });

  // Wrong extension — should pass through
  describe('when the file is not an SVG', () => {
    it('passes non-svg files through unchanged', async () => {
      const file = await vinylFile('sample.jpg');
      const originalSize = file.contents.length;

      const transform = svg({ prod: true, svgoOptions: {} });
      const result = await pipeFile(transform, file);

      assert.equal(result.contents.length, originalSize, 'non-svg file should not be touched');
    });
  });
});
