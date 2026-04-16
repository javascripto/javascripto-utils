import { createNumberMask } from './create-number-mask';

export const numberMask = createNumberMask({
  prefix: '',
  fractionSeparator: '.',
  fractionDigits: 2,
});

export const percentageMask = createNumberMask({
  prefix: '',
  fractionSeparator: '.',
  suffix: ' %',
  fractionDigits: 2,
});

export const currencyUSDMask = createNumberMask({
  prefix: '$',
  thousandSeparator: ',',
  fractionSeparator: '.',
  fractionDigits: 2,
});

export const currencyBRLMask = createNumberMask({
  prefix: 'R$ ',
  thousandSeparator: '.',
  fractionSeparator: ',',
  fractionDigits: 2,
});

export const currencyBTCMask = createNumberMask({
  prefix: '₿ ',
  fractionSeparator: '.',
  fractionDigits: 8,
});
