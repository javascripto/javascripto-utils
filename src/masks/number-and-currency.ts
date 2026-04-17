import { createNumberMask, makeNumberParser } from './create-number-mask';

export const numberMask = createNumberMask({
  prefix: '',
  fractionSeparator: '.',
  fractionDigits: 2,
  unsigned: false,
});

export const percentageMask = createNumberMask({
  prefix: '',
  fractionSeparator: '.',
  suffix: ' %',
  fractionDigits: 2,
  unsigned: false,
});

export const currencyUSDMask = createNumberMask({
  prefix: '$',
  thousandSeparator: ',',
  fractionSeparator: '.',
  fractionDigits: 2,
  unsigned: false,
});

export const currencyBRLMask = createNumberMask({
  prefix: 'R$ ',
  thousandSeparator: '.',
  fractionSeparator: ',',
  fractionDigits: 2,
  unsigned: false,
});

export const currencyBTCMask = createNumberMask({
  prefix: '₿ ',
  fractionSeparator: '.',
  fractionDigits: 8,
  unsigned: false,
});

export const parseNumberMask = makeNumberParser('.', 2);
export const parsePercentageMask = makeNumberParser('.', 2);
export const parseCurrencyUSDMask = makeNumberParser('.', 2);
export const parseCurrencyBRLMask = makeNumberParser(',', 2);
export const parseCurrencyBTCMask = makeNumberParser('.', 8);
