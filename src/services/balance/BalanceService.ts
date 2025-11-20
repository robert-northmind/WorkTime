import { calculateDuration } from '../time/TimeService';
import { getExpectedDailyHours, type WorkSchedule } from '../schedule/ScheduleService';

export interface DailyEntry {
  uid: string;
  date: string;
  startTime: string;
  endTime: string;
  lunchMinutes: number;
  extraHours: number;
  status: 'work' | 'vacation' | 'holiday' | 'sick';
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

  // Only calculate worked time if status is 'work' (or maybe user worked on holiday?)
  // Prompt says: "Mutual Exclusivity... A day can only be one of: work, vacation, holiday, sick"
  // But user might log time on a holiday?
  // Let's assume if status is 'work', we calculate time.
  // If status is 'vacation'/'holiday'/'sick', we assume 0 worked hours unless we want to support "working on a holiday".
  // For now, let's trust the inputs. If they put times in, we count them.
  // But usually vacation entries won't have times.
  
  if (entry.startTime && entry.endTime) {
    const duration = calculateDuration(entry.startTime, entry.endTime);
    actualMinutes = duration - entry.lunchMinutes;
  }
  
  if (entry.extraHours) {
    actualMinutes += entry.extraHours * 60; // extraHours is decimal or minutes?
    // Prompt: "extraHours (decimal or minutes)"
    // Let's assume the input model stores it as decimal hours based on "extraHours" name, 
    // but prompt said "All time inputs are minute-precision only".
    // Let's stick to the interface: `extraHours: number`. 
    // If the UI sends decimal hours, we multiply by 60.
    // If the UI sends minutes, we add directly.
    // The prompt says "extraHours (decimal or minutes)".
    // Let's standardize on DECIMAL HOURS for the `DailyEntry` interface as per my plan.
    // So `entry.extraHours * 60`.
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
