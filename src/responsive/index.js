/**
 * @localnerve/gulp-images — responsive
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import path from 'node:path';
import { Transform } from 'node:stream';
import gulpResponsive from '@localnerve/gulp-responsive';

/**
 * Gulp Transform that generates responsive image variants using @localnerve/gulp-responsive.
 *
 * When `settings.responsiveConfig` is non-empty the transform produces resized/reformatted
 * derivatives and—if `output` is provided—records each variant's metadata into that object
 * (keyed by original filename without extension, then by target width):
 *
 *   output[name][width] = { basename, mimeType }
 *
 * When `settings.responsiveConfig` is empty the transform is a no-op pass-through.
 *
 * @param {Object} settings - Build settings
 * @param {Object} settings.responsiveConfig - Config object forwarded to gulp-responsive
 * @param {Object} [output] - Optional object to receive image metadata.
 *   Treated the same as `data.images` in the original implementation.
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function responsive (settings, output) {
  const { responsiveConfig } = settings;

  if (Object.keys(responsiveConfig).length > 0) {
    const mimeTypes = {
      '.avif':  'image/avif',
      '.jpg':   'image/jpeg',
      '.jpeg':  'image/jpeg',
      '.gif':   'image/gif',
      '.png':   'image/png',
      '.svg':   'image/svg+xml',
      '.webp':  'image/webp'
      // add here as needed
    };

    return gulpResponsive(responsiveConfig, {
      errorOnUnusedConfig: false,
      errorOnUnusedImage:  false,
      passThroughUnused:   true,
      postprocess: (originalFile, config, newFile) => {
        if (!output) { return; }
        const key = path.parse(originalFile.relative).name;
        if (!output[key]) {
          output[key] = {};
        }
        output[key][config.width] = {
          basename: newFile.basename,
          mimeType: mimeTypes[newFile.extname]
        };
      }
    });
  }

  return new Transform({
    objectMode: true,
    transform: (file, enc, next) => next(null, file)
  });
}
