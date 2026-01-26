import {
  calculateDailyBalance,
  DailyEntry,
  isIncompleteEntry,
  shouldExcludeFromBalance,
  calculateInProgressMinutes
} from '../../../src/services/balance/BalanceService';
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

  describe('extra hours on non-working days', () => {
    it('handles sick day with extra hours', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'sick',
        startTime: '',
        endTime: '',
        lunchMinutes: 0,
        extraHours: 1.5
      };
      // Expected: 0
      // Worked: 90 mins (from extraHours only)
      // Balance: +90 mins
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(90);
      expect(balance.balanceMinutes).toBe(90);
    });

    it('handles vacation day with extra hours', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'vacation',
        startTime: '',
        endTime: '',
        lunchMinutes: 0,
        extraHours: 2.0
      };
      // Expected: 0
      // Worked: 120 mins (from extraHours only)
      // Balance: +120 mins
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(120);
      expect(balance.balanceMinutes).toBe(120);
    });

    it('handles grafana-day with extra hours', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'grafana-day',
        startTime: '',
        endTime: '',
        lunchMinutes: 0,
        extraHours: 1.0
      };
      // Expected: 0
      // Worked: 60 mins (from extraHours only)
      // Balance: +60 mins
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(60);
      expect(balance.balanceMinutes).toBe(60);
    });

    it('handles holiday with extra hours', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'holiday',
        startTime: '',
        endTime: '',
        lunchMinutes: 0,
        extraHours: 0.5
      };
      // Expected: 0
      // Worked: 30 mins (from extraHours only)
      // Balance: +30 mins
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(30);
      expect(balance.balanceMinutes).toBe(30);
    });

    it('handles sick day without extra hours (regression test)', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'sick',
        startTime: '',
        endTime: '',
        lunchMinutes: 0,
        extraHours: 0
      };
      // Expected: 0
      // Worked: 0
      // Balance: 0
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(0);
      expect(balance.balanceMinutes).toBe(0);
    });

    it('ignores startTime/endTime for sick day with extra hours', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        status: 'sick',
        startTime: '09:00',
        endTime: '17:00',
        lunchMinutes: 30,
        extraHours: 1.0
      };
      // Expected: 0
      // Worked: 60 mins (only from extraHours, startTime/endTime ignored)
      // Balance: +60 mins
      const balance = calculateDailyBalance(entry, schedule);
      expect(balance.expectedMinutes).toBe(0);
      expect(balance.actualMinutes).toBe(60);
      expect(balance.balanceMinutes).toBe(60);
    });
  });

  describe('isIncompleteEntry', () => {
    it('returns true for work entry with start time but no end time', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        startTime: '09:00',
        endTime: '',
        status: 'work'
      };
      expect(isIncompleteEntry(entry)).toBe(true);
    });

    it('returns false for work entry with both start and end time', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        startTime: '09:00',
        endTime: '17:00',
        status: 'work'
      };
      expect(isIncompleteEntry(entry)).toBe(false);
    });

    it('returns false for non-work entries even without end time', () => {
      const vacationEntry: DailyEntry = {
        ...baseEntry,
        startTime: '',
        endTime: '',
        status: 'vacation'
      };
      const sickEntry: DailyEntry = {
        ...baseEntry,
        startTime: '',
        endTime: '',
        status: 'sick'
      };
      expect(isIncompleteEntry(vacationEntry)).toBe(false);
      expect(isIncompleteEntry(sickEntry)).toBe(false);
    });

    it('returns false for work entry with no start time', () => {
      const entry: DailyEntry = {
        ...baseEntry,
        startTime: '',
        endTime: '',
        status: 'work'
      };
      expect(isIncompleteEntry(entry)).toBe(false);
    });
  });

  describe('shouldExcludeFromBalance', () => {
    it('returns true for incomplete entry on current day', () => {
      const referenceDate = new Date('2024-06-15T14:00:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '',
        status: 'work'
      };
      expect(shouldExcludeFromBalance(entry, referenceDate)).toBe(true);
    });

    it('returns false for complete entry on current day', () => {
      const referenceDate = new Date('2024-06-15T14:00:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '17:00',
        status: 'work'
      };
      expect(shouldExcludeFromBalance(entry, referenceDate)).toBe(false);
    });

    it('returns false for incomplete entry on past day', () => {
      const referenceDate = new Date('2024-06-15T14:00:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-14',
        startTime: '09:00',
        endTime: '',
        status: 'work'
      };
      expect(shouldExcludeFromBalance(entry, referenceDate)).toBe(false);
    });

    it('returns false for non-work entry on current day', () => {
      const referenceDate = new Date('2024-06-15T14:00:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '',
        endTime: '',
        status: 'vacation'
      };
      expect(shouldExcludeFromBalance(entry, referenceDate)).toBe(false);
    });
  });

  describe('calculateInProgressMinutes', () => {
    it('calculates minutes from start time to reference time', () => {
      const referenceDate = new Date('2024-06-15T14:30:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '',
        status: 'work',
        lunchMinutes: 30
      };
      // 09:00 to 14:30 = 5.5 hours = 330 minutes
      // Minus 30 min lunch = 300 minutes
      expect(calculateInProgressMinutes(entry, referenceDate)).toBe(300);
    });

    it('returns 0 for entry with no start time', () => {
      const referenceDate = new Date('2024-06-15T14:30:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '',
        endTime: '',
        status: 'work'
      };
      expect(calculateInProgressMinutes(entry, referenceDate)).toBe(0);
    });

    it('returns 0 for complete entry (has end time)', () => {
      const referenceDate = new Date('2024-06-15T14:30:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '17:00',
        status: 'work'
      };
      expect(calculateInProgressMinutes(entry, referenceDate)).toBe(0);
    });

    it('includes extra hours in calculation', () => {
      const referenceDate = new Date('2024-06-15T14:30:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '',
        status: 'work',
        lunchMinutes: 30,
        extraHours: 1
      };
      // 09:00 to 14:30 = 330 minutes - 30 lunch + 60 extra = 360 minutes
      expect(calculateInProgressMinutes(entry, referenceDate)).toBe(360);
    });

    it('returns 0 if reference time is before start time', () => {
      const referenceDate = new Date('2024-06-15T08:00:00');
      const entry: DailyEntry = {
        ...baseEntry,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '',
        status: 'work',
        lunchMinutes: 0
      };
      expect(calculateInProgressMinutes(entry, referenceDate)).toBe(0);
    });
  });
});
