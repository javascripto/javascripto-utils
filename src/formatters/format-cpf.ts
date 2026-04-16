import { keepOnlyDigits } from './keep-only-digits';

export function formatCPF(value = ''): string {
  return keepOnlyDigits(value)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}
export const parseCPF = (value = ''): string => keepOnlyDigits(value);
