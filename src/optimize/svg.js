/**
 * @localnerve/gulp-images — optimize/svg
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import { Transform } from 'node:stream';
import { optimize as svgOptimize } from 'svgo';
import { checkSkip, log, handleError, passThrough } from '../utils.js';

const pluginName = '@localnerve/optimize-svg';

/**
 * Gulp Transform that optimizes SVG files using svgo.
 * When `settings.prod` is false (non-production), files pass through unchanged.
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.svgoOptions] - Options forwarded to svgo `optimize()`
 * @param {boolean} settings.prod - Enable optimization only when true
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function svg (settings) {
  const { prod, svgoOptions } = settings;

  if (prod) {
    return new Transform({
      objectMode: true,
      transform: async (file, encoding, next) => {
        if (checkSkip(file, ['.svg'])) { return next(null, file); }
        if (file.isBuffer()) {
          try {
            const result = await svgOptimize(file.contents.toString('utf8'), {
              ...svgoOptions,
              path: file.path
            });
            file.contents = Buffer.from(result.data);

            log(pluginName, file, 'svg optimized');
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
