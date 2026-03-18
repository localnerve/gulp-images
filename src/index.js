/**
 * @localnerve/gulp-images — top-level entry point
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 *
 * Re-exports all three functional groups and the shared WASM initializer.
 *
 * Usage:
 *   import { initWasmModules, optimize, responsive, transform } from '@localnerve/gulp-images';
 *
 * Or import individual groups directly:
 *   import { svg, jpeg, png } from '@localnerve/gulp-images/optimize';
 *   import { responsive }     from '@localnerve/gulp-images/responsive';
 *   import { toWebp }         from '@localnerve/gulp-images/transform';
 */
export * as optimize    from './optimize/index.js';
export * as responsive  from './responsive/index.js';
export * as transform   from './transform/index.js';
export { initWasmModules } from './utils.js';
