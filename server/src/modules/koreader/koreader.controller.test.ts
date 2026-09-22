import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { KoreaderController } from './koreader.controller';

const THROTTLER_LIMIT_METADATA = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_METADATA = 'THROTTLER:TTLdefault';

describe('KoreaderController throttling', () => {
  it('allows authenticated progress synchronization bursts', () => {
    for (const handler of [KoreaderController.prototype.saveProgress, KoreaderController.prototype.getProgress]) {
      expect(Reflect.getMetadata(THROTTLER_LIMIT_METADATA, handler)).toBe(2_000);
      expect(Reflect.getMetadata(THROTTLER_TTL_METADATA, handler)).toBe(60_000);
    }
  });

  it('keeps the default throttle on the credential check', () => {
    expect(Reflect.getMetadata(THROTTLER_LIMIT_METADATA, KoreaderController.prototype.authenticateKoreader)).toBeUndefined();
  });
});
