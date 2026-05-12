/**
 * @localnerve/gulp-images — optimize/webp
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { decodeWebp, encodeWebp, checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-webp';

/**
 * Gulp Transform that re-encodes webp files using libwebp (via @jsquash/webp).
 * When `settings.prod` is false, files pass through unchanged.
 *
 * webp options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.webpOptions] - Options forwarded to the libwebp encoder
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function webp (settings) {
  const { prod, webpOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.webp'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const originalLen = file.contents.length;
            const imageData = await decodeWebp(file.contents);
            file.contents = Buffer.from(await encodeWebp(imageData, webpOptions));
            const optimizedLen = file.contents.length;
            const reductionPerc = (((originalLen - optimizedLen) / originalLen) * 100).toFixed(2);

            log(pluginName, file, `${file.extname.slice(1)} optimized (${reductionPerc}%)`);
            next(null, file);
          } catch (error) {
            handleError(pluginName, file, next, error);
          }
        }
      }
    });
  }

  return passThrough();
}
