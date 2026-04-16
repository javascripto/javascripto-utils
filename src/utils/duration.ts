export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export const ONE_MINUTE_SEC = 60;
export const ONE_HOUR_SEC = 60 * ONE_MINUTE_SEC;

export const TIME_PATTERN = /^\d+(?::\d+){0,2}$/;

export class Duration {
  private readonly milliseconds: number;

  constructor({
    minutes = 0,
    hours = 0,
    seconds = 0,
    milliseconds = 0,
  }: DurationParams = {}) {
    this.milliseconds =
      0 +
      hours * ONE_HOUR_MS +
      minutes * ONE_MINUTE_MS +
      seconds * ONE_SECOND_MS +
      milliseconds;
  }

  static fromTimeString(timeString: string): Duration {
    const value = timeString.trim();
    const parts = value.split(':');
    const numbers = parts.map(Number);
    const isValueTimeString = TIME_PATTERN.test(value);

    if (!isValueTimeString || numbers.some(Number.isNaN)) {
      throw new ParseDurationError(timeString);
    }

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    switch (numbers.length) {
      case 1:
        [seconds] = numbers as [number];
        return new Duration({ seconds });
      case 2:
        [minutes, seconds] = numbers as [number, number];
        return new Duration({ minutes, seconds });
      case 3:
        [hours, minutes, seconds] = numbers as [number, number, number];
        return new Duration({ hours, minutes, seconds });
      default:
        throw new ParseDurationError(timeString);
    }
  }

  get inMilliseconds() {
    return this.milliseconds;
  }

  get inSeconds() {
    return this.milliseconds / ONE_SECOND_MS;
  }

  get inMinutes() {
    return this.milliseconds / ONE_MINUTE_MS;
  }

  get inHours() {
    return this.milliseconds / ONE_HOUR_MS;
  }

  get inDays() {
    return this.milliseconds / ONE_DAY_MS;
  }

  get inWeeks() {
    return this.milliseconds / ONE_WEEK_MS;
  }

  toTimeString() {
    const totalSeconds = parseUnsigned(parseInteger(this.inSeconds));

    if (totalSeconds < ONE_MINUTE_SEC) return joinTimeParts([0, totalSeconds]);

    if (totalSeconds < ONE_HOUR_SEC) {
      const minutes = totalSeconds / ONE_MINUTE_SEC;
      const seconds = restOfDivision(totalSeconds, ONE_MINUTE_SEC);
      return joinTimeParts([minutes, seconds]);
    }

    const hours = totalSeconds / ONE_HOUR_SEC;
    const minutes = restOfDivision(totalSeconds, ONE_HOUR_SEC) / ONE_MINUTE_SEC;
    const seconds = restOfDivision(totalSeconds, ONE_MINUTE_SEC);

    return joinTimeParts([hours, minutes, seconds]);
  }
}

const parseInteger = (number: number) => Math.trunc(number);

const parseUnsigned = (number: number) => Math.abs(number);

const restOfDivision = (dividend: number, divider: number) =>
  dividend - parseInteger(dividend / divider) * divider;

const padLeftZero = (number = 0) =>
  parseInteger(number).toString().padStart(2, '0');

const joinTimeParts = (parts: number[]) => parts.map(padLeftZero).join(':');

type DurationParams = {
  minutes?: number;
  hours?: number;
  seconds?: number;
  milliseconds?: number;
};

export class ParseDurationError extends Error {
  constructor(value: string) {
    super(`${value} could not be parsed`);
    this.name = 'ParseDurationError';
  }
}
