import { describe, expect, test } from 'vitest';
import { Duration, ParseDurationError } from './duration';

describe('Duration.fromTimeString', () => {
  function catchError<E = Error>(fn: () => unknown): E | undefined {
    try {
      fn();
    } catch (error: unknown) {
      return error as E;
    }
  }

  test('should parse seconds (ss)', () => {
    expect(Duration.fromTimeString('45').inSeconds).toBe(45);
  });

  test('should parse minutes and seconds (mm:ss)', () => {
    expect(Duration.fromTimeString('12:34').inSeconds).toBe(754);
  });

  test('should parse hours, minutes, and seconds (hh:mm:ss)', () => {
    expect(Duration.fromTimeString('01:02:03').inSeconds).toBe(3723);
  });

  test('should throw for invalid value', () => {
    expect(() => Duration.fromTimeString('1:2:3:4')).toThrow(
      /1:2:3:4 could not be parsed/,
    );
    const error = catchError(() => Duration.fromTimeString('1:2:3:4'));
    expect(error).toBeInstanceOf(ParseDurationError);
  });
});

describe('Duration.toTimeString', () => {
  test('should format less than one minute as 00:ss', () => {
    expect(new Duration({ seconds: 9 }).toTimeString()).toBe('00:09');
  });

  test('should format less than one hour as mm:ss', () => {
    expect(new Duration({ minutes: 7, seconds: 5 }).toTimeString()).toBe(
      '07:05',
    );
  });

  test('should format one hour or more as hh:mm:ss', () => {
    expect(
      new Duration({ hours: 1, minutes: 2, seconds: 3 }).toTimeString(),
    ).toBe('01:02:03');
  });

  test('should use absolute value for negative durations', () => {
    expect(new Duration({ seconds: -65 }).toTimeString()).toBe('01:05');
  });
});

describe('Duration unit getters', () => {
  test('should expose values in all units', () => {
    const exact = new Duration({
      hours: 24,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    expect(exact.inMilliseconds).toBe(86_400_000);
    expect(exact.inSeconds).toBe(86_400);
    expect(exact.inMinutes).toBe(1_440);
    expect(exact.inHours).toBe(24);
    expect(exact.inDays).toBe(1);
    expect(exact.inWeeks).toBeCloseTo(1 / 7);
  });
});

describe('parseDurationLabel', () => {
  test('should return duration for valid time strings', () => {
    expect(Duration.fromTimeString('03:10')?.inSeconds).toBe(190);
  });
});
