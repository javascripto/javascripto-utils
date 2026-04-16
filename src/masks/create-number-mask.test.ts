import { describe, expect, test } from 'vitest';
import { createNumberMask } from './create-number-mask';

describe('createNumberMask', () => {
  test('should format numbers with prefix and separators while typing', () => {
    const mask = createNumberMask({
      prefix: 'R$ ',
      thousandSeparator: '.',
      fractionSeparator: ',',
      fractionDigits: 2,
    });
    const input = {
      value: '123456',
      selectionStart: 6,
      setSelectionRange() {},
    };

    mask({ target: input } as never);

    expect(input.value).toBe('R$ 1.234,56');
  });

  test('should keep empty input empty', () => {
    const mask = createNumberMask();
    let setSelectionRangeCalls = 0;
    const input = {
      value: '',
      selectionStart: 0,
      setSelectionRange() {
        setSelectionRangeCalls += 1;
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('');
    expect(setSelectionRangeCalls).toBe(0);
  });

  test('should handle suffix cursor adjustment', () => {
    const mask = createNumberMask({
      suffix: ' %',
      fractionDigits: 2,
      fractionSeparator: '.',
    });
    const calls: Array<[number, number | undefined]> = [];
    const input = {
      value: '1234',
      selectionStart: 4,
      setSelectionRange(start: number, end?: number) {
        calls.push([start, end]);
      },
    };

    mask({ target: input } as never);

    expect(input.value).toBe('12.34 %');
    expect(calls.at(-1)).toEqual([7, 5]);
  });
});
