/**
 * @localnerve/gulp-images — optimize group entry point
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 *
 * Exports the built-in optimizers. Callers can extend this group by spreading:
 *
 *   import * as optimize from '@localnerve/gulp-images/optimize';
 *   const myOptimize = { ...optimize, avif: myAvifFn };
 */
export { svg } from './svg.js';
export { jpeg } from './jpeg.js';
export { png } from './png.js';
