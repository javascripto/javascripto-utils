import { describe, expect, test } from "vitest";
import { suggestEmail } from "./suggest-email";


describe('suggestEmail', () => {
  test('should return empty string for empty input', () => {
    expect(suggestEmail()).toBe('');
  });

  test('should return empty string when there is no suggested email', () => {
    expect(suggestEmail('valid@email')).toBe('');
  });

  test('should return suggested email for possibly wrong email', () => {
    expect(suggestEmail('user@gmil.com')).toBe('user@gmail.com');
    expect(suggestEmail('user@hotmial.com')).toBe('user@hotmail.com');
    expect(suggestEmail('user@outlok.com')).toBe('user@outlook.com');
  });
})
