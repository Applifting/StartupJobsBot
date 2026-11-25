export interface LocalParts {
  // YYYY-MM-DD
  date: string;
  hour: number;
  // Mon, Tue, ...
  weekday: string;
}

export const localParts = (now: Date, timeZone: string): LocalParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number.parseInt(get('hour'), 10), weekday: get('weekday') };
};

/**
 * A job that runs once a day (or once a week) during a given local hour.
 * The "already ran today" memory lives in the process, so a restart inside that hour can run the job a second time.
 */
export class DailySlot {
  private lastRun?: string;

  constructor(private hour: number, private timeZone: string, private weekday?: string) {}

  public due(now: Date): boolean {
    if (this.hour < 0) {
      return false;
    }
    const local = localParts(now, this.timeZone);
    if (local.hour !== this.hour || (this.weekday && local.weekday !== this.weekday) || this.lastRun === local.date) {
      return false;
    }
    this.lastRun = local.date;
    return true;
  }
}

/** Number of working days (Mon-Fri) that started after `from`, up to and including today. */
export const workingDaysSince = (from: Date, now: Date, timeZone: string): number => {
  const today = localParts(now, timeZone).date;
  let count = 0;
  for (let i = 1; i <= 400; i++) {
    const day = localParts(new Date(from.getTime() + i * 24 * 60 * 60 * 1000), timeZone);
    if (day.date > today) {
      break;
    }
    if (day.weekday !== 'Sat' && day.weekday !== 'Sun') {
      count++;
    }
  }
  return count;
};
