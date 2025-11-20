import { calculateVacationStats, VacationSettings } from '../../../src/services/vacation/VacationService';
import { DailyEntry } from '../../../src/services/balance/BalanceService';

describe('VacationService', () => {
  const settings: VacationSettings = {
    yearStartMonth: 1, // Jan
    yearStartDay: 1,
    allowanceDays: 25
  };

  const baseEntry: DailyEntry = {
    uid: '1',
    date: '',
    startTime: '',
    endTime: '',
    lunchMinutes: 0,
    extraHours: 0,
    status: 'work'
  };

  it('calculates used and planned days correctly', () => {
    const today = '2023-06-01';
    const entries: DailyEntry[] = [
      { ...baseEntry, date: '2023-01-10', status: 'vacation' }, // Used
      { ...baseEntry, date: '2023-02-10', status: 'vacation' }, // Used
      { ...baseEntry, date: '2023-07-01', status: 'vacation' }, // Planned
      { ...baseEntry, date: '2023-08-01', status: 'work' },     // Work (ignored)
      { ...baseEntry, date: '2022-12-31', status: 'vacation' }  // Previous year (ignored)
    ];

    const stats = calculateVacationStats(entries, settings, today);
    
    expect(stats.allowanceDays).toBe(25);
    expect(stats.usedDays).toBe(2);
    expect(stats.plannedDays).toBe(1);
    expect(stats.remainingDays).toBe(22); // 25 - 2 - 1
  });

  it('handles custom vacation year start', () => {
    const customSettings: VacationSettings = {
      yearStartMonth: 4, // April
      yearStartDay: 1,
      allowanceDays: 20
    };
    
    // Current date: Feb 2024.
    // Current vacation year: Apr 1, 2023 - Mar 31, 2024.
    const today = '2024-02-01';
    
    const entries: DailyEntry[] = [
      { ...baseEntry, date: '2023-03-31', status: 'vacation' }, // Previous year
      { ...baseEntry, date: '2023-04-01', status: 'vacation' }, // This year (Used)
      { ...baseEntry, date: '2024-03-31', status: 'vacation' }, // This year (Planned)
      { ...baseEntry, date: '2024-04-01', status: 'vacation' }  // Next year
    ];

    const stats = calculateVacationStats(entries, customSettings, today);

    expect(stats.usedDays).toBe(1); // Apr 1 2023
    expect(stats.plannedDays).toBe(1); // Mar 31 2024
    expect(stats.remainingDays).toBe(18); // 20 - 1 - 1
  });
});
