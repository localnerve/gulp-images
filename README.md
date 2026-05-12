# @localnerve/gulp-images

> Portable (wasm & sharp), minimal dependency, streaming image processing for javascript builds. Optionally outputs image processing metadata to allow the images themselves to drive css generation and/or other work. Eventually, this project will be wasm only, no build chain required.

> **Offers Jpeg-xl optimization and transformations.**

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

All `optimize` and `transform` operations rely on WASM modules that must be initialized before any pipeline runs.

```js
import { initWasmModules } from '@localnerve/gulp-images';

// Use process.cwd() (default) or pass an explicit base path:
await initWasmModules();                        // looks for node_modules relative to cwd
await initWasmModules('/path/to/monorepo/root'); // explicit base path
```

### Full pipeline example
> Generates responsive images, then optimizes all images, then creates `webp` versions of all raster images.

```js
import gulp from 'gulp';
import { initWasmModules, optimize, responsive, transform } from '@localnerve/gulp-images';

await initWasmModules();

const settings = {
  prod: true,
  svgoOptions:      { /* svgo options */ },
  avifOptions:      { quality: 80, speed: 6 },
  jxlOptions:       { quality: 80 },
  mozjpegOptions:   { quality: 80 },
  oxipngOptions:    { level: 2 },
  webpOptions:      { quality: 80 },
  responsiveConfig: { /* gulp-responsive config */ }
};

const output = {}; // optional — receives image metadata from responsive + transform

gulp.series(
  function createResponsiveImages () {
    return gulp.src('dist/images/**', { encoding: false })
      .pipe(responsive.responsive(settings, output))
      .pipe(gulp.dest('dist/images'));
  }
  function optimizeImages () {
    return gulp.src('dist/images/**', { encoding: false })
      .pipe(optimize.svg(settings))
      .pipe(optimize.avif(settings))
      .pipe(optimize.jpeg(settings))
      .pipe(optimize.jxl(settings))
      .pipe(optimize.png(settings))
      .pipe(gulp.dest('dist/images'));
  },
  function convertToWebp () {
    return gulp.src('dist/images/**', { encoding: false })
      .pipe(transform.toWebp(settings, output)) // toAvif, toJxl available
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
| `avif(settings)` | Optimizes AVIFs via libavif ([`@jsquash/avif`](https://github.com/jamsinclair/jSquash)). No-op unless `settings.prod === true`. |
| `jxl(settings)` | Optimizes JXLs via libjxl ([`@jsquash/jxl`](https://github.com/jamsinclair/jSquash)). No-op unless `settings.prod === true`. |
| `webp(settings)` | Optimizes WEBPs via libavif ([`@jsquash/webp`](https://github.com/jamsinclair/jSquash)). No-op unless `settings.prod === true`. |

**`settings` keys used by optimize:**

| Key | Type | Used by | Reference |
|-----|------|---------|-----------------|
| `prod` | `boolean` | all — enables optimization | **This Doc** |
| `svgoOptions` | `object` | `svg` | [reference](https://svgo.dev/docs/plugins/) |
| `mozjpegOptions` | `object` | `jpeg` | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/jpeg/meta.ts) |
| `oxipngOptions` | `object` | `png` | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/oxipng/meta.ts) |
| `avifOptions` | `object` | `avif` | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/avif/meta.ts) |
| `jxlOptions` | `object` | `jxl` | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/jxl/meta.ts) |
| `webpOptions` | `object` | `webp` | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts) |

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

| Key | Type | Description | Reference |
|-----|------|-------------|-----------|
| `responsiveConfig` | `object` | Forwarded directly to `gulp-responsive` | [reference](https://github.com/localnerve/gulp-responsive/blob/public-package/README.md#configuration-unit) |

---

### `transform` — `@localnerve/gulp-images/transform`

| Export | Description |
|--------|-------------|
| `toWebp(settings, output?)` | Converts `.avif`, `.jpg`, `.jpeg`, `.jxl` and `.png` files to `.webp` using [`@jsquash/webp`](https://github.com/jamsinclair/jSquash). |
| `toAvif(settings, output?)` | Converts `.jpg`, `.jpeg`, `.jxl`, `.png`, and `.webp` files to `.avif` using [`@jsquash/avif`](https://github.com/jamsinclair/jSquash). |
| `toJxl(settings, output?)` | Converts `.avif`, `.jpg`, `.jpeg`, `.png`, and `.webp` files to `.jxl` using [`@jsquash/jxl`](https://github.com/jamsinclair/jSquash). |

`output` (optional) — if supplied, converted file metadata is updated:
```js
// example output created for `toWebp`:
output[key][width].basename = 'file.webp';
output[key][width].mimeType = 'image/webp';
```
The `key` and `width` are derived from the input image filename convention `<key1>-<key2>-<width>.<ext>` (same convention as `gulp-responsive` output).

**`settings` keys used:**

| Key | Type | Description | Reference |
|-----|------|-------------|-----------|
| `webpOptions` | `object` | Forwarded to the WebP encoder | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts) |
| `avifOptions` | `object` | Forwarded to the Avif encoder | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/avif/meta.ts) |
| `jxlOptions` | `object` | Forwarded to the Jxl encoder | [reference](https://github.com/jamsinclair/jSquash/blob/main/packages/jxl/meta.ts) |

---

## License

AGPL-3.0-or-later — Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
