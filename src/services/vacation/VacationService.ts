import type { DailyEntry } from '../balance/BalanceService';

export interface VacationSettings {
  yearStartMonth: number; // 1-12
  yearStartDay: number; // 1-31
  allowanceDays: number;
  yearlyAllowances?: Record<string, number>; // Year -> Days
}

export interface VacationStats {
  usedDays: number;
  plannedDays: number;
  remainingDays: number;
  allowanceDays: number;
}

/**
 * Calculates vacation statistics for the CURRENT vacation year based on 'today'.
 */
export const calculateVacationStats = (
  entries: DailyEntry[], 
  settings: VacationSettings, 
  todayDateString: string
): VacationStats => {
  const today = new Date(todayDateString + 'T00:00:00');
  const currentYear = today.getFullYear();
  
  // Determine start of vacation year relative to today
  // If today is before the start date in the current calendar year, 
  // then we are in the vacation year that started in the PREVIOUS calendar year.
  
  let startYear = currentYear;
  const startMonthIndex = settings.yearStartMonth - 1; // 0-11
  
  const thisYearStart = new Date(currentYear, startMonthIndex, settings.yearStartDay);
  
  if (today < thisYearStart) {
    startYear = currentYear - 1;
  }
  
  const vacationYearStart = new Date(startYear, startMonthIndex, settings.yearStartDay);
  const vacationYearEnd = new Date(startYear + 1, startMonthIndex, settings.yearStartDay); 
  
  // Determine allowance for this vacation year
  const allowance = settings.yearlyAllowances?.[startYear.toString()] ?? settings.allowanceDays;

  let usedDays = 0;
  let plannedDays = 0;
  
  entries.forEach(entry => {
    if (entry.status !== 'vacation') return;
    
    const entryDate = new Date(entry.date + 'T00:00:00');
    
    // Check if within range
    if (entryDate >= vacationYearStart && entryDate < vacationYearEnd) {
      if (entryDate < today) {
        usedDays++;
      } else {
        plannedDays++;
      }
    }
  });
  
  return {
    usedDays,
    plannedDays,
    remainingDays: allowance - usedDays - plannedDays,
    allowanceDays: allowance
  };
};
