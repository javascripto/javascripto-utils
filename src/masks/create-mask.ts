export type ChangeEvent<T = HTMLInputElement> = {
  target: T;
};

type MaskConfig = {
  format: (rawValue: string) => string;
  parse?: (maskedValue: string) => string;
  preserveCursor?: boolean;
};

function getCursorFromRawPosition(
  maskedValue: string,
  parse: (maskedValue: string) => string,
  rawCursorPosition: number,
) {
  if (rawCursorPosition <= 0) return 0;
  for (let index = 1; index <= maskedValue.length; index++) {
    const rawValueBeforeIndex = parse(maskedValue.slice(0, index));
    if (rawValueBeforeIndex.length >= rawCursorPosition) return index;
  }
  return maskedValue.length;
}

export function createMask({
  format,
  parse = value => value,
  preserveCursor = true,
}: MaskConfig) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const maskedValue = input.value;
    const selectionStart = input.selectionStart ?? maskedValue.length;
    const rawValue = parse(maskedValue);
    const rawValueBeforeCursor = parse(maskedValue.slice(0, selectionStart));
    const nextMaskedValue = format(rawValue);

    input.value = nextMaskedValue;

    if (!preserveCursor) return;

    const nextCursorPosition = getCursorFromRawPosition(
      nextMaskedValue,
      parse,
      rawValueBeforeCursor.length,
    );

    input.setSelectionRange(nextCursorPosition, nextCursorPosition);
  };
}
