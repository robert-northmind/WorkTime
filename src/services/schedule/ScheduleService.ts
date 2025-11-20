export interface WorkSchedule {
  effectiveDate: string; // YYYY-MM-DD
  weeklyHours: number;
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

/**
 * Calculates the expected hours for a specific date based on the schedule history.
 * Does NOT account for holidays/vacations (that logic belongs in a higher layer).
 */
export const getExpectedDailyHours = (date: string, schedules: WorkSchedule[]): number => {
  // 1. Find the active schedule
  // Sort schedules by effectiveDate descending
  const sortedSchedules = [...schedules].sort((a, b) => 
    b.effectiveDate.localeCompare(a.effectiveDate)
  );

  const activeSchedule = sortedSchedules.find(s => s.effectiveDate <= date);

  if (!activeSchedule) {
    return 0;
  }

  // 2. Check if it's a work day
  // Note: new Date('YYYY-MM-DD') is treated as UTC in some envs, but local in others depending on parsing.
  // To be safe with YYYY-MM-DD strings, we should ensure we get the correct day of week.
  // App assumption: "Time zone does not matter; treat times as simple local times."
  // We can append 'T00:00:00' to ensure local time parsing or use a library.
  // For now, let's use a simple helper or ensure the date string is parsed correctly.
  // Actually, `new Date('2023-06-05')` is UTC. `new Date('2023-06-05T00:00:00')` is local.
  // Let's use the T00:00:00 trick to be safe for "local" day of week.
  
  const localDate = new Date(`${date}T00:00:00`);
  const localDay = localDate.getDay();

  if (!activeSchedule.workDays.includes(localDay)) {
    return 0;
  }

  // 3. Calculate daily portion
  const daysPerWeek = activeSchedule.workDays.length;
  if (daysPerWeek === 0) return 0;

  return activeSchedule.weeklyHours / daysPerWeek;
};
