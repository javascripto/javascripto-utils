import type { StringInput } from '../types';

export function normalizeStringInput(value: StringInput = ''): string {
  return value ?? '';
}
