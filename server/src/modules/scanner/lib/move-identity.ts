import { stat } from 'fs/promises';
import type { BookFile } from '../../../db/schema';
import type { FileStat } from './walk';
import { computeFileHash } from './hash';

type PreviousFile = Pick<BookFile, 'absolutePath' | 'sizeBytes' | 'mtime' | 'fileHash'>;
type CurrentFile = Pick<FileStat, 'absolutePath' | 'sizeBytes' | 'mtime'>;

export async function isSameMovedFile(current: CurrentFile, previous: PreviousFile): Promise<boolean> {
  if (
    current.absolutePath === previous.absolutePath ||
    current.sizeBytes !== previous.sizeBytes ||
    current.mtime.getTime() !== previous.mtime?.getTime() ||
    !previous.fileHash
  ) {
    return false;
  }

  try {
    await stat(previous.absolutePath);
    return false;
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) return false;
  }

  try {
    return (await computeFileHash(current.absolutePath)) === previous.fileHash;
  } catch {
    return false;
  }
}
