/**
 * @localnerve/gulp-images — optimize/avif
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { decodeAvif, encodeAvif, checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-avif';

/**
 * Gulp Transform that re-encodes avif files using libavif (via @jsquash/avif).
 * When `settings.prod` is false, files pass through unchanged.
 *
 * avif options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/avif/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.avifOptions] - Options forwarded to the libavif encoder
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function avif (settings) {
  const { prod, avifOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.avif'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const originalLen = file.contents.length;
            const imageData = await decodeAvif(file.contents);
            file.contents = Buffer.from(await encodeAvif(imageData, avifOptions));
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
