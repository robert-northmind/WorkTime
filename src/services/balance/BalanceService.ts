import { calculateDuration, timeToMinutes, isToday } from '../time/TimeService';
import { getExpectedDailyHours, type WorkSchedule } from '../schedule/ScheduleService';

export interface DailyEntry {
  uid: string;
  date: string;
  startTime: string;
  endTime: string;
  lunchMinutes: number;
  extraHours: number;
  status: string;
  notes?: string;
}

export interface DailyBalanceResult {
  actualMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
}

export const calculateDailyBalance = (entry: DailyEntry, schedules: WorkSchedule[]): DailyBalanceResult => {
  // 1. Calculate Actual Worked Minutes
  let actualMinutes = 0;

  // For work status: calculate from startTime/endTime + extraHours
  // For non-work statuses: only use extraHours (ignore startTime/endTime)
  if (entry.status === 'work') {
    if (entry.startTime && entry.endTime) {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      actualMinutes = duration - entry.lunchMinutes;
    }

    if (entry.extraHours) {
      actualMinutes += entry.extraHours * 60;
    }
  } else {
    // Non-work statuses (vacation, sick, holiday, grafana-day, etc.)
    // Only count extraHours, ignore any startTime/endTime
    if (entry.extraHours) {
      actualMinutes = entry.extraHours * 60;
    }
  }

  // 2. Calculate Expected Minutes
  let expectedMinutes = 0;

  if (entry.status === 'work') {
    const expectedHours = getExpectedDailyHours(entry.date, schedules);
    expectedMinutes = expectedHours * 60;
  } else {
    // Vacation, Holiday, Sick -> Expected = 0
    expectedMinutes = 0;
  }

  // 3. Balance
  const balanceMinutes = actualMinutes - expectedMinutes;

  return {
    actualMinutes,
    expectedMinutes,
    balanceMinutes
  };
};

/**
 * Checks if an entry is incomplete (work status with start time but no end time).
 */
export const isIncompleteEntry = (entry: DailyEntry): boolean => {
  return entry.status === 'work' && !!entry.startTime && !entry.endTime;
};

/**
 * Determines if an entry should be excluded from balance calculations.
 * Returns true if: it's today AND the entry is incomplete.
 */
export const shouldExcludeFromBalance = (entry: DailyEntry, referenceDate: Date = new Date()): boolean => {
  return isToday(entry.date, referenceDate) && isIncompleteEntry(entry);
};

/**
 * Calculates "in progress" minutes for an incomplete entry.
 * Returns time from start to now, minus lunch, plus extra hours.
 * Returns 0 if entry is complete or has no start time.
 */
export const calculateInProgressMinutes = (entry: DailyEntry, referenceDate: Date = new Date()): number => {
  if (!entry.startTime || entry.endTime) return 0;

  const startMinutes = timeToMinutes(entry.startTime);
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  let inProgressMinutes = nowMinutes - startMinutes;
  if (inProgressMinutes < 0) return 0;

  inProgressMinutes -= entry.lunchMinutes || 0;
  inProgressMinutes += (entry.extraHours || 0) * 60;

  return Math.max(0, inProgressMinutes);
};
