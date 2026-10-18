import { mkdtemp, rename, rm, stat, utimes, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { computeFileHash } from './hash';
import { isSameMovedFile } from './move-identity';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'scanner-move-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function movedFile() {
  const oldPath = join(directory, 'old.epub');
  const newPath = join(directory, 'new.epub');
  await writeFile(oldPath, 'original book');
  const info = await stat(oldPath);
  const previous = { absolutePath: oldPath, sizeBytes: info.size, mtime: info.mtime, fileHash: await computeFileHash(oldPath) };
  await rename(oldPath, newPath);
  const current = { absolutePath: newPath, sizeBytes: info.size, mtime: info.mtime };
  return { previous, current };
}

it('preserves a genuine rename', async () => {
  const { current, previous } = await movedFile();
  expect(await isSameMovedFile(current, previous)).toBe(true);
});

it('rejects unrelated contents even with matching size and modification time', async () => {
  const { current, previous } = await movedFile();
  await writeFile(current.absolutePath, 'another ebook');
  await utimes(current.absolutePath, previous.mtime, previous.mtime);
  expect(await isSameMovedFile(current, previous)).toBe(false);
});

it('rejects a move when the old file still exists', async () => {
  const { current, previous } = await movedFile();
  await writeFile(previous.absolutePath, 'original book');
  expect(await isSameMovedFile(current, previous)).toBe(false);
});

it.each(['size', 'mtime', 'hash'] as const)('rejects missing identity evidence: %s', async (field) => {
  const { current, previous } = await movedFile();
  if (field === 'size') previous.sizeBytes += 1;
  if (field === 'mtime') previous.mtime = new Date(0);
  if (field === 'hash') previous.fileHash = '';
  expect(await isSameMovedFile(current, previous)).toBe(false);
});

it('rejects a file that disappears during verification', async () => {
  const { current, previous } = await movedFile();
  await rm(current.absolutePath);
  expect(await isSameMovedFile(current, previous)).toBe(false);
});
