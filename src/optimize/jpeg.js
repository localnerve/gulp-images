/**
 * @localnerve/gulp-images — optimize/jpeg
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { decodeJpeg, encodeJpeg, checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-jpeg';

/**
 * Gulp Transform that losslessly re-encodes JPEG files using mozjpeg (via @jsquash/jpeg).
 * When `settings.prod` is false, files pass through unchanged.
 *
 * mozjpeg options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/jpeg/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.mozjpegOptions] - Options forwarded to the mozjpeg encoder
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function jpeg (settings) {
  const { prod, mozjpegOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.jpg', '.jpeg'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const originalLen = file.contents.length;
            const imageData = await decodeJpeg(file.contents);
            file.contents = Buffer.from(await encodeJpeg(imageData, mozjpegOptions));
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
