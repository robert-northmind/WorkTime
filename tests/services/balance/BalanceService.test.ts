import { calculateDailyBalance, DailyEntry } from '../../../src/services/balance/BalanceService';
import { WorkSchedule } from '../../../src/services/schedule/ScheduleService';

describe('BalanceService', () => {
  const schedule: WorkSchedule[] = [{
    effectiveDate: '2023-01-01',
    weeklyHours: 40,
    workDays: [1, 2, 3, 4, 5] // Mon-Fri, 8 hours/day
  }];

  const baseEntry: DailyEntry = {
    date: '2023-06-05', // Monday
    startTime: '09:00',
    endTime: '17:00',
    lunchMinutes: 30,
    extraHours: 0,
    status: 'work',
    uid: 'test',
    notes: ''
  };

  it('calculates balance for a standard work day', () => {
    // 9 to 17 = 8 hours (480 mins)
    // Lunch 30 mins
    // Worked: 450 mins (7.5 hours)
    // Expected: 8 hours (480 mins)
    // Balance: -30 mins
    const balance = calculateDailyBalance(baseEntry, schedule);
    expect(balance.actualMinutes).toBe(450);
    expect(balance.expectedMinutes).toBe(480);
    expect(balance.balanceMinutes).toBe(-30);
  });

  it('calculates balance with extra hours', () => {
    const entry = { ...baseEntry, extraHours: 1 }; // +60 mins
    // Worked: 450 + 60 = 510 mins
    // Expected: 480 mins
    // Balance: +30 mins
    const balance = calculateDailyBalance(entry, schedule);
    expect(balance.actualMinutes).toBe(510);
    expect(balance.balanceMinutes).toBe(30);
  });

  it('handles vacation days', () => {
    const entry: DailyEntry = { 
      ...baseEntry, 
      status: 'vacation',
      startTime: '',
      endTime: '',
      lunchMinutes: 0
    };
    // Expected: 0
    // Worked: 0
    // Balance: 0
    const balance = calculateDailyBalance(entry, schedule);
    expect(balance.expectedMinutes).toBe(0);
    expect(balance.balanceMinutes).toBe(0); // 0 - 0
  });

  it('handles holidays', () => {
    const entry: DailyEntry = { 
      ...baseEntry, 
      status: 'holiday',
      startTime: '',
      endTime: '',
      lunchMinutes: 0
    };
    const balance = calculateDailyBalance(entry, schedule);
    expect(balance.expectedMinutes).toBe(0);
    expect(balance.balanceMinutes).toBe(0);
  });

  it('handles sick days', () => {
    const entry: DailyEntry = { 
      ...baseEntry, 
      status: 'sick',
      startTime: '',
      endTime: '',
      lunchMinutes: 0
    };
    const balance = calculateDailyBalance(entry, schedule);
    expect(balance.expectedMinutes).toBe(0);
    expect(balance.balanceMinutes).toBe(0);
  });

  it('handles work on a non-work day (e.g. weekend)', () => {
    const entry: DailyEntry = { 
      ...baseEntry, 
      date: '2023-06-04', // Sunday
      startTime: '10:00',
      endTime: '12:00',
      lunchMinutes: 0
    };
    // Expected: 0
    // Worked: 120 mins
    // Balance: +120 mins
    const balance = calculateDailyBalance(entry, schedule);
    expect(balance.expectedMinutes).toBe(0);
    expect(balance.actualMinutes).toBe(120);
    expect(balance.balanceMinutes).toBe(120);
  });
});
