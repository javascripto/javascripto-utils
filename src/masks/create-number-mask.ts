import type { ChangeEvent } from './create-mask';

const defaultOptions = {
  suffix: '',
  prefix: '',
  fractionDigits: 2,
  thousandSeparator: '',
  fractionSeparator: '.',
  unsigned: true,
};

export function createNumberMask({
  suffix = defaultOptions.suffix,
  prefix = defaultOptions.prefix,
  fractionDigits = defaultOptions.fractionDigits,
  thousandSeparator = defaultOptions.thousandSeparator,
  fractionSeparator = defaultOptions.fractionSeparator,
  unsigned = defaultOptions.unsigned,
}: Partial<typeof defaultOptions> = defaultOptions) {
  return function numberMask(
    event: ChangeEvent<HTMLInputElement> & { nativeEvent?: InputEvent },
  ) {
    const input = event.target;
    const value = input.value;
    const cursorPosition = input.selectionStart || 0;
    // detect optional leading minus sign when unsigned === false
    const trimmed = value.trimStart();

    // Track presence of '-' in the raw input and allow toggling via typing '-'.
    const typedChar = event.nativeEvent?.data;
    const containsMinus = /-/.test(trimmed);
    if (!unsigned) {
      if (typedChar === '-') {
        const currentlyNegative = input.dataset.negative === 'true';
        input.dataset.negative = (!currentlyNegative).toString();
      } else {
        // Keep dataset in sync with actual '-' presence (handles delete/cut actions).
        input.dataset.negative = containsMinus ? 'true' : 'false';
      }
    }

    const sign = !unsigned && input.dataset.negative === 'true' ? '-' : '';
    // remove any '-' characters typed inside the input before extracting digits
    const trimmedWithoutMinus = trimmed.replace(/-/g, '');
    const rawDigits = trimmedWithoutMinus.replace(/[^0-9]/g, '');
    if (!rawDigits) {
      // preserve lone '-' so user can type negative numbers progressively
      input.value = sign ? sign : '';
      return;
    }
    const floatFixedValue = (Number(rawDigits) / 10 ** fractionDigits).toFixed(
      fractionDigits,
    );
    const [integer, mantissa] = floatFixedValue.split('.') as [string, string];
    const left = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    // place sign before prefix (e.g. -$1,234.00)
    input.value = `${sign}${prefix}${left}${fractionSeparator}${mantissa}${suffix}`;
    let newCursorPosition =
      cursorPosition + (input.value.length - value.length);
    newCursorPosition = Math.max(
      0,
      Math.min(newCursorPosition, input.value.length),
    );
    if (suffix && cursorPosition === value.length) {
      input.setSelectionRange(
        newCursorPosition,
        newCursorPosition - suffix.length,
      );
    } else {
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  };
}

// Utility: escape RegExp special chars in a string
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

// Create a parser that normalizes formatted numbers into a numeric string
// with '.' as decimal separator and padded fraction digits. Preserves leading '-'.
export function makeNumberParser(
  fractionSeparator: string,
  fractionDigits: number,
) {
  const separatorEscaped = escapeRegExp(fractionSeparator);
  return (display: string) => {
    if (!display) return '';
    const trimmedDisplay = String(display).trim();
    const sign = trimmedDisplay.startsWith('-') ? '-' : '';
    const cleanedString = trimmedDisplay.replace(
      new RegExp(`[^0-9${separatorEscaped}]`, 'g'),
      '',
    );
    if (!cleanedString) return '';
    const normalizedWithDot =
      fractionSeparator === '.'
        ? cleanedString
        : cleanedString.replace(new RegExp(separatorEscaped), '.');
    const [integerPart, fractionPart = ''] = normalizedWithDot.split('.');
    const fractionPadded = (fractionPart + '0'.repeat(fractionDigits)).slice(
      0,
      fractionDigits,
    );
    return `${sign}${integerPart}${fractionDigits > 0 ? `.${fractionPadded}` : ''}`;
  };
}
