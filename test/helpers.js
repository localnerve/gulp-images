/**
 * Test helpers — build Vinyl file objects from disk fixtures.
 *
 * Copyright (c) 2025 Alex Grant <info@localnerve.com> (https://www.localnerve.com), LocalNerve LLC
 * AGPL-3.0-or-later
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Vinyl from 'vinyl';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(__dirname, 'fixtures', 'img');

/**
 * Create a Vinyl file object from a fixture on disk.
 *
 * @param {string} filename - Fixture filename (relative to fixtures/img/)
 * @returns {Promise<import('vinyl')>}
 */
export async function vinylFile(filename) {
  const filePath = path.join(FIXTURES, filename);
  const contents = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  return new Vinyl({
    cwd: path.dirname(FIXTURES),
    base: FIXTURES,
    path: filePath,
    contents,
    stat
  });
}

/**
 * Pipe a single Vinyl file through a Transform stream and collect the result.
 *
 * @param {import('stream').Transform} transform - The transform to pipe through
 * @param {import('vinyl')} file - The vinyl file to process
 * @returns {Promise<import('vinyl')>} The (possibly mutated) output file
 */
export function pipeFile(transform, file) {
  return new Promise((resolve, reject) => {
    transform.on('data', resolve);
    transform.on('error', reject);
    transform.write(file);
  });
}
