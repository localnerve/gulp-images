/**
 * @localnerve/gulp-images — shared utilities.
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { Transform } from 'node:stream';
import PluginError from 'plugin-error';
import { simd, relaxedSimd } from 'wasm-feature-detect';
import decodeAvif, { init as initAvifDecode } from '@jsquash/avif/decode.js';
import encodeAvif, { init as initAvifEncode } from '@jsquash/avif/encode.js';
import decodeJpeg, { init as initJpegDecode } from '@jsquash/jpeg/decode.js';
import encodeJpeg, { init as initJpegEncode } from '@jsquash/jpeg/encode.js';
import decodeJxl, { init as initJxlDecode } from '@jsquash/jxl/decode.js';
import encodeJxl, { init as initJxlEncode } from '@jsquash/jxl/encode.js';
import decodePng, { init as initPngDecode } from '@jsquash/png/decode.js';
import encodePng, { init as initPngEncode } from '@jsquash/oxipng/optimise.js';
import decodeWebp, { init as initWebpDecode } from '@jsquash/webp/decode.js';
import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode.js';

export {
  decodeAvif,
  encodeAvif,
  decodeJpeg,
  encodeJpeg,
  decodeJxl,
  encodeJxl,
  decodePng,
  encodePng,
  decodeWebp,
  encodeWebp
};

/**
 * Check skip condition for a vinyl stream object.
 * Skip if: not the right extension, empty file, or a stream/null.
 *
 * @param {import('vinyl')} file - Vinyl file object passing through
 * @param {string[]} exts - Array of dot-prefixed extensions to allow, e.g. ['.jpg']
 * @returns {boolean} true if the file should be skipped
 */
export function checkSkip(file, exts) {
  return (
    !exts.includes(file.extname.toLowerCase()) ||
    !file.contents.toString('utf8') ||
    file.isStream() ||
    file.isNull()
  );
}

/**
 * Colorized console logger.
 *
 * @param {string} owner - The plugin/function name
 * @param {import('vinyl')} file - Vinyl file object
 * @param {string} message - The log message
 * @param {'log'|'error'} [method='log'] - console method to use
 */
export function log(owner, file, message, method = 'log') {
  const colors = {
    magenta: '\x1b[35m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    reset: '\x1b[0m'
  };
  const filepath = path.relative(process.cwd(), file.path);
  const now = new Date();
  const TN = i => i < 10 ? `0${i}` : i;
  const timestring = `${TN(now.getHours())}:${TN(now.getMinutes())}:${TN(now.getSeconds())}`;

  console[method](
    `[${colors.magenta}${timestring}${colors.reset}] \n${owner}: ${method === 'log' ? colors.green : colors.red}File ${filepath} - ${colors.yellow}${message}${colors.reset}`
  );
}

/**
 * Handle an error inside a gulp transform stream.
 *
 * @param {string} owner - The plugin/function name
 * @param {import('vinyl')} file - Vinyl file object
 * @param {Function} next - The transform callback
 * @param {Error|string} error - The error
 */
export function handleError(owner, file, next, error) {
  const colors = { reset: '\x1b[0m' };
  const filepath = path.relative(process.cwd(), file.path);
  let message = error.message || error;

  if (message) {
    message = message
      .replace('Line:', `${colors.reset}File: ${filepath}\nLine:`)
      .replace(/\n/g, '\n\t')
      .trim();
    log(owner, file, message, 'error');
  }

  next(new PluginError(owner, message));
}

/**
 * Pass-through transform (no-op).
 * Returned by optimize functions when not in production mode.
 *
 * @returns {Transform}
 */
export function passThrough() {
  return new Transform({
    objectMode: true,
    transform: (file, enc, next) => next(null, file)
  });
}

// ---------------------------------------------------------------------------
// WASM codec paths relative to a base directory
// ---------------------------------------------------------------------------
const WASM_PATHS = {
  avifDecode: 'node_modules/@jsquash/avif/codec/dec/avif_dec.wasm',
  avifEncode: 'node_modules/@jsquash/avif/codec/enc/avif_enc.wasm',
  jpegDecode: 'node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  jpegEncode: 'node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  jxlDecode: 'node_modules/@jsquash/jxl/codec/dec/jxl_dec.wasm',
  jxlEncode: 'node_modules/@jsquash/jxl/codec/enc/jxl_enc.wasm',
  pngDecode: 'node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
  pngEncode: 'node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm',
  webpDecode: 'node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',
  webpEncode: 'node_modules/@jsquash/webp/codec/enc/webp_enc.wasm',
  webpEncodeSIMD: 'node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm'
};

/**
 * Initialize all WASM codec modules.
 * Call this once before running any image transforms.
 *
 * @param {string} [wasmBasePath] - Absolute path to the directory that contains
 *   the `node_modules` folder where the @jsquash packages are installed.
 *   Defaults to `process.cwd()`.
 */
export async function initWasmModules(wasmBasePath = process.cwd()) {
  const resolve = rel => path.join(wasmBasePath, rel);

  // Test simd support
  const simdSupport = await Promise.allSettled([simd(), relaxedSimd()]);
  const hasSimdSupport = simdSupport.some(r => r.status === 'fulfilled' && r.value);

  const avifDecWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.avifDecode)));
  await initAvifDecode(avifDecWasmModule);

  const avifEncWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.avifEncode)));
  await initAvifEncode(avifEncWasmModule);

  const jpegDecWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.jpegDecode)));
  await initJpegDecode(jpegDecWasmModule);

  const jpegEncWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.jpegEncode)));
  await initJpegEncode(jpegEncWasmModule);

  const jxlDecWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.jxlDecode)));
  await initJxlDecode(jxlDecWasmModule);

  const jxlPath = WASM_PATHS.jxlEncode; // only single threaded for now
  const jxlEncWasmModule = await WebAssembly.compile(await fs.readFile(resolve(jxlPath)));
  await initJxlEncode(jxlEncWasmModule);

  const pngDecWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.pngDecode)));
  await initPngDecode(pngDecWasmModule);

  const oxipngWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.pngEncode)));
  await initPngEncode(oxipngWasmModule);

  const webpDecWasmModule = await WebAssembly.compile(await fs.readFile(resolve(WASM_PATHS.webpDecode)));
  await initWebpDecode(webpDecWasmModule);

  // use SIMD variant if supported (~10 % faster)
  const webpPath = hasSimdSupport ? WASM_PATHS.webpEncodeSIMD : WASM_PATHS.webpEncode;
  const webpEncWasmModule = await WebAssembly.compile(await fs.readFile(resolve(webpPath)));
  await initWebpEncode(webpEncWasmModule);
}
