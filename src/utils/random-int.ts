type RandomIntArgs = { min?: number; max?: number };

const defaultArgs: Required<RandomIntArgs> = { min: 0, max: 9 };

export function randomInt({
  min = defaultArgs.min,
  max = defaultArgs.max,
}: RandomIntArgs = defaultArgs): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
