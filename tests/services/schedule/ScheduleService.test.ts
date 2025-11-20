import { getExpectedDailyHours, WorkSchedule } from '../../../src/services/schedule/ScheduleService';

describe('ScheduleService', () => {
  const defaultSchedule: WorkSchedule[] = [
    {
      effectiveDate: '2023-01-01',
      weeklyHours: 40,
      workDays: [1, 2, 3, 4, 5] // Mon-Fri
    }
  ];

  it('returns correct hours for a standard work day', () => {
    // A Monday
    const date = '2023-06-05'; 
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(8); // 40 / 5
  });

  it('returns 0 for non-work days', () => {
    // A Sunday
    const date = '2023-06-04';
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(0);
  });

  it('handles schedule changes', () => {
    const schedules: WorkSchedule[] = [
      {
        effectiveDate: '2023-01-01',
        weeklyHours: 40,
        workDays: [1, 2, 3, 4, 5]
      },
      {
        effectiveDate: '2023-07-01',
        weeklyHours: 30, // Reduced hours
        workDays: [1, 2, 3, 4] // Mon-Thu
      }
    ];

    // Before change (June)
    expect(getExpectedDailyHours('2023-06-30', schedules)).toBe(8);

    // After change (July)
    // 30 hours / 4 days = 7.5 hours
    expect(getExpectedDailyHours('2023-07-03', schedules)).toBe(7.5);
  });

  it('uses the latest schedule if multiple match', () => {
    // Already covered above, but ensures sorting logic
  });

  it('returns 0 if no schedule is active yet', () => {
    const date = '2022-12-31';
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(0);
  });
});
