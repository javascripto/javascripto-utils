import { describe, expect, test } from 'vitest';
import { removePrimitiveValues } from './remove-primitive-values';

describe('removeRecordPrimitiveValues', () => {
  const record = {
    emptyString: '',
    undefined: undefined,
    null: null,
    false: false,
    true: true,
    zero: 0,
    number: 42,
    string: 'text',
  };
  Object.freeze(record);

  test('should not remove values from the record when no values are specified', () => {
    const newRecord = removePrimitiveValues(record, []);
    expect(newRecord).toEqual({ ...record });
  });
  test('should remove falsy values from the record', () => {
    const valuesToRemove = ['', undefined, null, false, 0];
    const newRecord = removePrimitiveValues(record, valuesToRemove);
    expect(newRecord).toEqual({
      true: true,
      number: 42,
      string: 'text',
    });
  });

  test('should remove only undefined values from the record', () => {
    const valuesToRemove = [undefined];
    const newRecord = removePrimitiveValues(record, valuesToRemove);
    expect(newRecord).toEqual({
      emptyString: '',
      null: null,
      false: false,
      true: true,
      zero: 0,
      number: 42,
      string: 'text',
    });
  });

  test('should not remove reference values from the record', () => {
    const record = {
      object: {},
      array: [],
      boolean: true,
    };
    const valuesToRemove = [[], {}, true];
    const newRecord = removePrimitiveValues(record, valuesToRemove);
    expect(newRecord).toEqual({
      object: {},
      array: [],
    });
    expect(newRecord.boolean).toBeUndefined();
    expect(Object.values(newRecord)).not.toContain(true);
  });
});
