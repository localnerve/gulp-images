/**
 * Tests for responsive — @localnerve/gulp-images
 *
 * gulp-responsive config reference:
 * https://raw.githubusercontent.com/localnerve/gulp-responsive/refs/heads/public-package/README.md
 *
 * These tests create a minimal Gulp src→responsive→dest pipeline using
 * vinyl-source-stream / vinyl-fs so we can test the actual stream behavior.
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Writable } from 'node:stream';
import gulp from 'gulp';
import { responsive } from '../src/responsive/index.js';
import { FIXTURES } from './helpers.js';

/**
 * Run a gulp src→responsive stream and collect all output Vinyl files.
 *
 * @param {string} glob - Source glob (relative to fixtures/img)
 * @param {Object} settings - Settings object for responsive()
 * @param {Object} [output] - Optional output metadata object
 * @returns {Promise<import('vinyl')[]>}
 */
function runResponsive(glob, settings, output) {
  return new Promise((resolve, reject) => {
    const files = [];
    const sink = new Writable({
      objectMode: true,
      write(file, _enc, cb) { files.push(file); cb(); }
    });
    sink.on('finish', () => resolve(files));

    const stream = gulp
      .src(path.join(FIXTURES, glob), { encoding: false })
      .pipe(responsive(settings, output));

    stream.pipe(sink);
    stream.on('error', reject);
  });
}

describe('responsive', () => {
  describe('when responsiveConfig is empty', () => {
    it('passes all files through unchanged (pass-through mode)', async () => {
      const files = await runResponsive('sample.jpg', { responsiveConfig: {} });
      assert.ok(files.length > 0, 'should emit at least one file');
      for (const f of files) {
        assert.ok(f.contents.length > 0, 'contents should be non-empty');
      }
    });
  });

  describe('when responsiveConfig specifies a resize', () => {
    let outputFiles;
    let outputMeta;

    before(async () => {
      outputMeta = {};

      // Resize hero-main-800.jpg to two widths
      outputFiles = await runResponsive('hero-main-800.jpg', {
        responsiveConfig: {
          'hero-main-800.jpg': [
            {
              width: 400,
              quality: 70,
              rename: { suffix: '-400' }
            },
            {
              width: 200,
              quality: 65,
              rename: { suffix: '-200' }
            }
          ]
        }
      }, outputMeta);
    });

    it('emits the expected number of resized files', () => {
      assert.equal(outputFiles.length, 2, 'should produce 2 variants');
    });

    it('variants have .jpg extension', () => {
      for (const f of outputFiles) {
        assert.equal(f.extname, '.jpg', `expected .jpg, got ${f.extname}`);
      }
    });

    it('variants are smaller than the 800px source would be (width reduction)', () => {
      for (const f of outputFiles) {
        // A 200–400px jpg should be meaningfully smaller than the 800px source
        // (the 800px fixture is ~16 KB)
        assert.ok(f.contents.length < 16817, `${f.basename} is unexpectedly large`);
      }
    });
  });

  describe('output metadata population', () => {
    let outputMeta;

    before(async () => {
      outputMeta = {};

      await runResponsive('hero-main-800.png', {
        responsiveConfig: {
          'hero-main-800.png': {
            width: 300,
            rename: { suffix: '-300' }
          }
        }
      }, outputMeta);
    });

    it('populates output with the original file key', () => {
      // key is derived from path.parse(originalFile.relative).name
      const keys = Object.keys(outputMeta);
      assert.ok(keys.length > 0, 'output should have at least one key');
    });

    it('each entry contains basename and mimeType', () => {
      for (const key of Object.keys(outputMeta)) {
        for (const [width, meta] of Object.entries(outputMeta[key])) {
          assert.ok(meta.basename, `${key}[${width}] should have basename`);
          assert.ok(meta.mimeType, `${key}[${width}] should have mimeType`);
        }
      }
    });
  });

  describe('when output is not provided', () => {
    it('does not throw and still emits files', async () => {
      // Omitting output — the postprocess no-ops
      const files = await runResponsive('sample.jpg', {
        responsiveConfig: {
          'sample.jpg': { width: 100 }
        }
      }); // no output argument

      assert.ok(files.length >= 1, 'should still emit resized files without output');
    });
  });
});
