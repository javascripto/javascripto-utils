import { createMask } from './create-mask';

export const upperCaseMask = createMask({
  format: value => value.toUpperCase(),
});
