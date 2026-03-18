# @localnerve/gulp-images

> Portable (wasm & sharp), minimal dependency, streaming image processing for javascript builds. Optionally outputs image processing metadata to allow the images themselves to drive css generation and/or other work.

Reusable Gulp image-processing transforms extracted from [jam-build](https://github.com/localnerve/jam-build).

Three functional groups — **optimize**, **responsive**, and **transform** — each independently importable and easily extensible.

---

## Installation

```bash
npm install @localnerve/gulp-images
```

Requires `gulp` as a peer dependency.

---

## Usage

### Initialize WASM codecs first

All JPEG, PNG, and WebP operations rely on WASM modules that must be initialized before any pipeline runs.

```js
import { initWasmModules } from '@localnerve/gulp-images';

// Use process.cwd() (default) or pass an explicit base path:
await initWasmModules();                        // looks for node_modules relative to cwd
await initWasmModules('/path/to/monorepo/root'); // explicit base path
```

### Full pipeline example

```js
import gulp from 'gulp';
import { initWasmModules, optimize, responsive, transform } from '@localnerve/gulp-images';

await initWasmModules();

const settings = {
  prod: true,
  svgoOptions:      { /* svgo options */ },
  mozjpegOptions:   { quality: 80 },
  oxipngOptions:    { level: 2 },
  webpOptions:      { quality: 80 },
  responsiveConfig: { /* gulp-responsive config */ }
};

const output = {}; // optional — receives image metadata from responsive + toWebp

gulp.series(
  function optimizeAndResponsive () {
    return gulp.src('dist/images/**', { encoding: false })
      .pipe(responsive.responsive(settings, output))
      .pipe(optimize.svg(settings))
      .pipe(optimize.jpeg(settings))
      .pipe(optimize.png(settings))
      .pipe(gulp.dest('dist/images'));
  },
  function convertToWebp () {
    return gulp.src('dist/images/**', { encoding: false })
      .pipe(transform.toWebp(settings, output))
      .pipe(gulp.dest('dist/images'));
  }
)();
```

---

## Groups

### `optimize` — `@localnerve/gulp-images/optimize`

| Export | Description |
|--------|-------------|
| `svg(settings)` | Optimizes SVG files via [svgo](https://github.com/svg/svgo). No-op unless `settings.prod === true`. |
| `jpeg(settings)` | Re-encodes JPEGs via mozjpeg ([`@jsquash/jpeg`](https://github.com/jamsinclair/jSquash)). No-op unless `settings.prod === true`. |
| `png(settings)` | Optimizes PNGs via oxipng ([`@jsquash/oxipng`](https://github.com/jamsinclair/jSquash)). No-op unless `settings.prod === true`. |

**Extend the group:**
```js
import * as optimize from '@localnerve/gulp-images/optimize';
const myOptimize = { ...optimize, avif: myAvifOptimizer };
```

**`settings` keys used by optimize:**

| Key | Type | Used by |
|-----|------|---------|
| `prod` | `boolean` | all — enables optimization |
| `svgoOptions` | `object` | `svg` |
| `mozjpegOptions` | `object` | `jpeg` |
| `oxipngOptions` | `object` | `png` |

---

### `responsive` — `@localnerve/gulp-images/responsive`

| Export | Description |
|--------|-------------|
| `responsive(settings, output?)` | Generates responsive image variants via [`@localnerve/gulp-responsive`](https://github.com/localnerve/gulp-responsive). |

`settings` - The @localnerve/gulp-responsive config defined in the [full configuration details](https://github.com/localnerve/gulp-responsive/blob/public-package/README.md#config).

`output` (optional) — if supplied, variant metadata is written as:
```js
output[originalName][width] = { basename, mimeType }
```

**`settings` keys used:**

| Key | Type | Description |
|-----|------|-------------|
| `responsiveConfig` | `object` | Forwarded directly to `gulp-responsive` |

---

### `transform` — `@localnerve/gulp-images/transform`

| Export | Description |
|--------|-------------|
| `toWebp(settings, output?)` | Converts `.jpg`, `.jpeg`, and `.png` files to `.webp` using [`@jsquash/webp`](https://github.com/jamsinclair/jSquash). |

`output` (optional) — if supplied, converted file metadata is updated:
```js
output[key][width].basename = 'file.webp';
output[key][width].mimeType = 'image/webp';
```
The `key` and `width` are derived from the filename convention `<key1>-<key2>-<width>.<ext>` (same convention as `gulp-responsive` output).

**Extend the group:**
```js
import * as transform from '@localnerve/gulp-images/transform';
const myTransform = { ...transform, toAvif: myAvifConverter };
```

**`settings` keys used:**

| Key | Type | Description |
|-----|------|-------------|
| `webpOptions` | `object` | Forwarded to the WebP encoder |

---

## License

AGPL-3.0-or-later — Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
