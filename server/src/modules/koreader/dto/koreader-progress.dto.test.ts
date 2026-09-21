import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { SaveProgressDto } from './koreader-progress.dto';

const validProgress = {
  document: '86a141c935fd4bbb2d8c273fd85c8259',
  progress: '/body/DocFragment[5]/body',
  percentage: 0.42,
  device: 'Readest (macOS)',
  device_id: 'reader-device',
};

async function validateProgress(input: Record<string, unknown>) {
  return validate(plainToInstance(SaveProgressDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('SaveProgressDto', () => {
  it('accepts KOReader document metadata sent by current clients', async () => {
    const errors = await validateProgress({
      ...validProgress,
      metadata: {
        filename: 'The Book.epub',
        title: 'The Book',
        authors: 'Example Author',
      },
    });

    expect(errors).toEqual([]);
  });

  it('rejects non-object metadata', async () => {
    const errors = await validateProgress({ ...validProgress, metadata: 'The Book.epub' });

    expect(errors.some((error) => error.property === 'metadata')).toBe(true);
  });

  it('continues to reject unknown top-level fields', async () => {
    const errors = await validateProgress({ ...validProgress, unexpected: true });

    expect(errors.some((error) => error.property === 'unexpected')).toBe(true);
  });
});
