import type { Id } from './types';

export function createId(): Id {
  return crypto.randomUUID();
}
