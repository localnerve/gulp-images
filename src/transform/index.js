/**
 * @localnerve/gulp-images — transform group entry point
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 *
 * Exports the built-in image transforms. Callers can extend this group by spreading:
 *
 *   import * as transform from '@localnerve/gulp-images/transform';
 *   const myTransform = { ...transform, toAvif: myAvifFn };
 */
export { toWebp } from './toWebp.js';
