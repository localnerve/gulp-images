/**
 * @localnerve/gulp-images — optimize/jxl
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { decodeJxl, encodeJxl, checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-jxl';

/**
 * Gulp Transform that re-encodes jxl files using libjxl (via @jsquash/jxl).
 * When `settings.prod` is false, files pass through unchanged.
 *
 * jxl options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/jxl/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.jxlOptions] - Options forwarded to the libjxl encoder
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function jxl (settings) {
  const { prod, jxlOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.jxl'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const originalLen = file.contents.length;
            const imageData = await decodeJxl(file.contents);
            file.contents = Buffer.from(await encodeJxl(imageData, jxlOptions));
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
