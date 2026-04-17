import { describe, expect, test } from 'vitest';
import { createMask } from './create-mask';

describe('createMask', () => {
  test('should format input as the user types', () => {
    const mask = createMask({
      format: value => value.toUpperCase(),
    });
    const input = {
      value: 'abc',
      selectionStart: 3,
      setSelectionRange() {},
    };

    mask({ target: input } as never);

    expect(input.value).toBe('ABC');
  });

  test('should preserve cursor position based on parsed raw value', () => {
    const mask = createMask({
      parse: value => value.replace(/\D/g, ''),
      format: value => value.replace(/(\d{3})(\d)/, '$1-$2'),
    });
    const input = {
      value: '124',
      selectionStart: 2,
      setSelectionRange(start: number) {
        input.selectionStart = start;
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('124');
    expect(input.selectionStart).toBe(2);
  });

  test('should skip cursor handling when preserveCursor is false', () => {
    const mask = createMask({
      format: value => value.toUpperCase(),
      preserveCursor: false,
    });
    let setSelectionRangeCalls = 0;
    const input = {
      value: 'abc',
      selectionStart: 3,
      setSelectionRange() {
        setSelectionRangeCalls += 1;
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('ABC');
    expect(setSelectionRangeCalls).toBe(0);
  });

  test('should place cursor at zero when selectionStart is zero', () => {
    const mask = createMask({
      parse: value => value.replace(/\D/g, ''),
      format: value => value.replace(/(\d{3})(\d)/, '$1-$2'),
    });
    const input = {
      value: '1234',
      selectionStart: 0,
      setSelectionRange(start: number) {
        input.selectionStart = start;
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('123-4');
    expect(input.selectionStart).toBe(0);
  });

  test('should default cursor to the end when selectionStart is null', () => {
    const mask = createMask({
      parse: value => value.replace(/\D/g, ''),
      format: value => value.replace(/(\d{3})(\d)/, '$1-$2'),
    });
    const input = {
      value: '1234',
      selectionStart: null,
      setSelectionRange(start: number) {
        input.selectionStart = start;
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('123-4');
    expect(input.selectionStart).toBe(5);
  });
});
