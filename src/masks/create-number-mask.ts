import type { ChangeEvent } from './create-mask';

const defaultOptions = {
  suffix: '',
  prefix: '',
  fractionDigits: 2,
  thousandSeparator: '',
  fractionSeparator: '.',
};

export function createNumberMask({
  suffix = defaultOptions.suffix,
  prefix = defaultOptions.prefix,
  fractionDigits = defaultOptions.fractionDigits,
  thousandSeparator = defaultOptions.thousandSeparator,
  fractionSeparator = defaultOptions.fractionSeparator,
}: Partial<typeof defaultOptions> = defaultOptions) {
  return function numberMask(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const value = input.value;
    const cursorPosition = input.selectionStart || 0;
    const rawValue = value.replace(/\D/g, '');
    if (!rawValue) {
      input.value = '';
      return;
    }
    const floatFixedValue = (Number(rawValue) / 10 ** fractionDigits).toFixed(
      fractionDigits,
    );
    const [integer, mantissa] = floatFixedValue.split('.') as [string, string];
    const left = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    input.value = `${prefix}${left}${fractionSeparator}${mantissa}${suffix}`;
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
