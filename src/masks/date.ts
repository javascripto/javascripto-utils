import { formatDateBR, formatDateISO8601, keepOnlyDigits } from '../formatters';
import { createMask } from './create-mask';

export const dateISO8601Mask = createMask({
  parse: keepOnlyDigits,
  format: formatDateISO8601,
});

export const dateBRMask = createMask({
  parse: keepOnlyDigits,
  format: formatDateBR,
});
