export function removePrimitiveValues<T extends Record<string, unknown>, V>(
  record: T,
  valuesToRemove: V[],
): Record<string, unknown> {
  const entries = Object.entries(record).filter(
    ([_, value]) => !valuesToRemove.includes(value as V),
  );
  return Object.fromEntries(entries);
}
