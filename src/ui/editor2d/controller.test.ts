import { describe, expect, it } from 'vitest';
import { sanitizeTypedLength } from './controller';

describe('sanitizeTypedLength', () => {
  it('keeps digits and a single decimal comma', () => {
    expect(sanitizeTypedLength('350')).toBe('350');
    expect(sanitizeTypedLength('12.5')).toBe('12,5');
    expect(sanitizeTypedLength('1,2,3')).toBe('1,23');
    expect(sanitizeTypedLength('abc 40 cm')).toBe('40');
  });
});
