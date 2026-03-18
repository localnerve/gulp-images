/**
 * @localnerve/gulp-images — transform/toWebp
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import path from 'node:path';
import { Transform } from 'node:stream';
import { decodeJpeg, decodePng, encodeWebp, checkSkip, log, handleError } from '../utils.js';

const pluginName = '@localnerve/to-webp';

/**
 * Gulp Transform that converts raster images (jpg/jpeg/png) to WebP.
 *
 * Converted files have their extension replaced with `.webp`.  When the
 * filename follows the `<key>-<sub>-<width>` naming convention used by
 * gulp-responsive output AND `output` is provided, the transform also
 * updates `output[key][width]` with the new basename and mimeType—mirroring
 * the `data.images` updates in the original implementation.
 *
 * webp encoder options reference:
 * https://github.com/jamsinclair/jSquash/blob/main/packages/webp/meta.ts
 *
 * @param {Object} settings - Build settings
 * @param {Object} [settings.webpOptions] - Options forwarded to the WebP encoder
 * @param {Object} [output] - Optional object to receive updated image metadata
 *   (same shape written by `responsive`): output[key][width] = { basename, mimeType }
 * @returns {Transform} A Node.js Transform stream in object mode
 */
export function toWebp(settings, output) {
  const { webpOptions } = settings;
  const exts = ['.jpg', '.jpeg', '.png'];
  const decoders = [decodeJpeg, decodeJpeg, decodePng];

  return new Transform({
    objectMode: true,
    transform: async (file, encoding, next) => {
      if (checkSkip(file, exts)) {
        return next(null, file);
      }

      if (file.isBuffer()) {
        try {
          const decoderIndex = exts.indexOf(file.extname.toLowerCase());
          const originalFile = file.path;
          const originalExt = file.extname;

          // derive metadata keys from filename convention: <key-parts>-<width>
          const name = path.parse(file.relative).name;
          const nameParts = name.split('-');
          const key = nameParts.slice(0, 2).join('-');
          const width = nameParts.slice(2, 3)[0];

          const imageData = await decoders[decoderIndex](file.contents);
          file.contents = Buffer.from(await encodeWebp(imageData, webpOptions));

          for (const ext of exts) {
            file.path = file.path.replace(ext, '.webp');

            if (originalFile !== file.path) {
              // update caller-supplied output metadata if provided
              if (output) {
                const val = output?.[key]?.[width];
                if (val) {
                  val.basename = file.basename;
                  val.mimeType = 'image/webp';
                }
              }
              break; // a file won't be both .jpg and .jpeg
            }
          }

          if (file.stat) {
            file.stat.atime = file.stat.mtime = file.stat.ctime = new Date();
          }

          log(pluginName, file, `${originalExt.slice(1)} converted to webp`);
          next(null, file);
        } catch (error) {
          handleError(pluginName, file, next, error);
        }
      }
    }
  });
}
