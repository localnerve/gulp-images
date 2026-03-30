/**
 * @localnerve/gulp-images — optimize/png
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { decodePng, encodePng, checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-png';

/**
 * Gulp Transform that optimizes PNG files using oxipng (via @jsquash/oxipng).
 * When `settings.prod` is false, files pass through unchanged.
 *
 * oxipng options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/oxipng/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.oxipngOptions] - Options forwarded to the oxipng optimizer
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function png (settings) {
  const { prod, oxipngOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.png'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const originalLen = file.contents.length;
            const imageData = await decodePng(file.contents);
            file.contents = Buffer.from(await encodePng(imageData, oxipngOptions));
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
