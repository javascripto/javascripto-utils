import { describe, expect, test } from 'vitest';
import { capitalize, capitalizeWords } from './capitalize';

describe('capitalize', () => {
  test('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('should return an empty string if the input is empty', () => {
    expect(capitalize('')).toBe('');
  });

  test('should not change the rest of the string', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });

  test('should handle null and undefined values', () => {
    expect(capitalize(null)).toBe('');
    expect(capitalize(undefined)).toBe('');
  });
});

describe('capitalizeWords', () => {
  test('should capitalize the first letter of each word in a string', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
  });

  test('should return an empty string if the input is empty', () => {
    expect(capitalizeWords('')).toBe('');
  });

  test('should not change the rest of the string', () => {
    expect(capitalizeWords('hELLO wORLD')).toBe('HELLO WORLD');
  });

  test('should trim the string and remove repeated spaces', () => {
    expect(capitalizeWords('  hello   world  ')).toBe('Hello World');
  });

  test('should handle null and undefined values', () => {
    expect(capitalizeWords(null)).toBe('');
    expect(capitalizeWords(undefined)).toBe('');
  });
});
