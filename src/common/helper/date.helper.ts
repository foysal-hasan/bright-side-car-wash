import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Date helper
 */
export class DateHelper {
  /**
   * Add days
   * @param value
   * @param unit
   * @returns
   */
  static add(value: number, unit: dayjs.ManipulateType) {
    return dayjs(value).add(30, unit);
  }

  // format date
  static format(date: number | string | Date) {
    const d = new Date(date);
    return d.toISOString();
  }
  static formatDate(date: number | string | Date) {
    const d = new Date(date);
    return d.toDateString();
  }

  static now() {
    const date = new Date();
    return date;
  }

  static nowString() {
    const date = new Date();
    return date.toISOString();
  }

  static nowDate() {
    const date = new Date();
    return date.toDateString();
  }

  static addDays(dateData, days: number) {
    days = Number(days);
    const date = new Date(dateData.valueOf());
    date.setDate(date.getDate() + days);
    return date.toDateString();
  }

  static addMonths(dateData, months: number) {
    months = Number(months);
    const date = new Date(dateData.valueOf());
    date.setMonth(date.getMonth() + months);
    return date.toDateString();
  }

  static addYears(dateData, years: number) {
    years = Number(years);
    const date = new Date(dateData.valueOf());
    date.setFullYear(date.getFullYear() + years);
    return date.toDateString();
  }

  static addHours(dateData, hours: number) {
    hours = Number(hours);
    const date = new Date(dateData.valueOf());
    date.setHours(date.getHours() + hours);
    return date.toDateString();
  }

  static addMinutes(dateData, minutes: number) {
    minutes = Number(minutes);
    const date = new Date(dateData.valueOf());
    date.setMinutes(date.getMinutes() + minutes);
    return date.toDateString();
  }

  static addSeconds(dateData, seconds: number) {
    seconds = Number(seconds);
    const date = new Date(dateData.valueOf());
    date.setSeconds(date.getSeconds() + seconds);
    return date.toDateString();
  }

  static diff(
    date1: string,
    date2: string,
    unit?: dayjs.QUnitType | dayjs.OpUnitType,
    float?: boolean,
  ) {
    const date1Data = dayjs(date1);
    const date2Data = dayjs(date2);

    return date2Data.diff(date1Data, unit, float);
  }

  static to24Hour(time: string): string {
    // Already 24-hour
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return time;
    }

    // 12-hour AM/PM
    const match = time.match(/(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)/i);
    if (!match) return time;

    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }


  static normalizeAmPm(value?: string): string | undefined {
    // 🔐 Guard clause (MOST IMPORTANT)
    if (!value || typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    const match = trimmed.match(
      /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i
    );

    // If it doesn't match, return original value
    // (let @Matches handle validation)
    if (!match) {
      return trimmed;
    }

    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    const period = match[3].toUpperCase();

    return `${hour}:${minute} ${period}`;
  }


  static toUtcDateTime(
    scheduleDate: Date,
    time: string,
    timeZone: string,
  ): Date {
    const date = dayjs(scheduleDate).format('YYYY-MM-DD');

    return dayjs
      .tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm A', timeZone)
      .utc()
      .toDate();
  }


  /**
 * Check if a datetime is in the past (compared to now)
 */
 static isPast(date: Date): boolean {
  return dayjs(date).isBefore(dayjs());
}

/**
 * Check if end datetime is same or before start datetime
 */
static isSameOrBefore(
  end: Date,
  start: Date,
): boolean {
  return (
    dayjs(end).isSame(dayjs(start)) ||
    dayjs(end).isBefore(dayjs(start))
  );
}


}
