import {
  formatCNPJ,
  formatCPF,
  formatRG,
  parseCNPJ,
  parseCPF,
  parseRG,
} from '../formatters';
import { formatCarPlate, parseCarPlate } from '../formatters/format-car-plate';
import { createMask } from './create-mask';

export const rgMask = createMask({
  parse: parseRG,
  format: formatRG,
});

export const cpfMask = createMask({
  parse: parseCPF,
  format: formatCPF,
});

export const cnpjMask = createMask({
  parse: parseCNPJ,
  format: formatCNPJ,
});

export const carPlateMask = createMask({
  parse: parseCarPlate,
  format: formatCarPlate,
});
