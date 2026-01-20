import { calculateDuration } from '../time/TimeService';
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
