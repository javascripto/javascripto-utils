
export function wait(milliseconds = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
