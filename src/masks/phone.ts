import { formatPhone, parsePhone } from '../formatters';
import { createMask } from './create-mask';

export const phoneMask = createMask({
  parse: parsePhone,
  format: formatPhone,
});
