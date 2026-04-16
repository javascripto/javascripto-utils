import { keepOnlyDigits } from './keep-only-digits';

export const CPF_PLACEHOLDER = '000.000.000-00';
export const CPF_DIGTIS_LENGTH = 11;

export function formatCPF(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export const parseCPF = (value = ''): string =>
  keepOnlyDigits(value).substring(0, CPF_DIGTIS_LENGTH);
