type RandomIntArgs = { min?: number; max?: number };

const defaultArgs: Required<RandomIntArgs> = { min: 0, max: 9 };

export function randomInt({
  min = defaultArgs.min,
  max = defaultArgs.max,
}: RandomIntArgs = defaultArgs): number {
  if (min > max) throw new Error('min should be less than or equal to max');
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
