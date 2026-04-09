import {
  calculateYearlyBalance,
  calculateAverageWeeklyHours,
  calculateDayOfWeekStats,
  countSickDays,
} from "../../../src/services/stats/StatsService";
import type { DailyEntry } from "../../../src/services/balance/BalanceService";
import type { WorkSchedule } from "../../../src/services/schedule/ScheduleService";

// Helper to create a mock entry
const createEntry = (
  date: string,
  startTime = "09:00",
  endTime = "17:00",
  status = "work",
  lunchMinutes = 30,
  extraHours = 0,
): DailyEntry => ({
  uid: "test-uid",
  date,
  startTime,
  endTime,
  lunchMinutes,
  extraHours,
  status,
  notes: "",
});

const defaultSchedule: WorkSchedule[] = [
  {
    effectiveDate: "2023-01-01",
    weeklyHours: 40,
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
  },
];

describe("StatsService", () => {
  describe("calculateYearlyBalance", () => {
    it("should return 0 for empty entries", () => {
      const result = calculateYearlyBalance([], defaultSchedule);
      expect(result.balanceMinutes).toBe(0);
    });

    it("should calculate positive balance for overtime work", () => {
      // 09:00 - 18:00 = 9h, minus 30min lunch = 8.5h worked = 510 min
      // Expected: 8h = 480 min, so +30 min balance
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Monday, +30 min
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceMinutes).toBe(30);
    });

    it("should calculate negative balance for undertime work", () => {
      // 09:00 - 16:30 = 7.5h, minus 30min lunch = 7h worked = 420 min
      // Expected: 8h = 480 min, so -60 min balance
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "16:30"), // Monday, -60 min
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceMinutes).toBe(-60);
    });

    it("should sum balance across multiple entries", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min
        createEntry("2023-06-06", "09:00", "18:00"), // Tue: +30 min
        createEntry("2023-06-07", "09:00", "16:30"), // Wed: -60 min
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceMinutes).toBe(0); // +30 +30 -60 = 0
    });

    it("should exclude incomplete entries for today", () => {
      const today = new Date("2023-06-07T14:00:00");
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min (complete)
        createEntry("2023-06-07", "09:00", "", "work"), // Wed (today): incomplete
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule, today);
      expect(result.balanceMinutes).toBe(30); // Only counts completed entry
    });

    it("should include non-work entries with 0 expected hours", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min work
        createEntry("2023-06-06", "", "", "vacation"), // Tue: vacation (0 balance)
        createEntry("2023-06-07", "", "", "sick"), // Wed: sick (0 balance)
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceMinutes).toBe(30);
    });

    it("should handle extra hours on non-work days", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-06", "", "", "vacation", 0, 2), // Tue: vacation with 2h extra
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceMinutes).toBe(120); // 2 hours = 120 minutes
    });

    it("should return formatted balance string", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // +30 min
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceFormatted).toBe("0:30");
    });

    it("should format negative balance correctly", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "16:30"), // -60 min
      ];

      const result = calculateYearlyBalance(entries, defaultSchedule);
      expect(result.balanceFormatted).toBe("-1:00");
    });
  });

  describe("calculateAverageWeeklyHours", () => {
    it("should return expected hours when no entries", () => {
      const result = calculateAverageWeeklyHours([], defaultSchedule, 40);
      expect(result.avgMinutes).toBe(2400); // 40h = 2400 min
      expect(result.avgFormatted).toBe("40:00");
    });

    it("should calculate average weekly hours with positive balance", () => {
      // Week 23 of 2023: June 5-11
      // One week with +30 min balance = avg weekly hours = 40h + 0.5min = 40:30/week
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min
      ];

      const result = calculateAverageWeeklyHours(entries, defaultSchedule, 40);
      expect(result.avgMinutes).toBe(2430); // 40h + 30min = 2430 min
      expect(result.avgFormatted).toBe("40:30");
    });

    it("should calculate average across multiple weeks", () => {
      // Week 23: +60 min, Week 24: -60 min => avg = 0
      const entries: DailyEntry[] = [
        // Week 23 (June 5-11): +60 min total
        createEntry("2023-06-05", "09:00", "18:30"), // Mon: +60 min
        // Week 24 (June 12-18): -60 min total
        createEntry("2023-06-12", "09:00", "16:30"), // Mon: -60 min
      ];

      const result = calculateAverageWeeklyHours(entries, defaultSchedule, 40);
      expect(result.avgMinutes).toBe(2400); // 40h + 0 = 2400 min
      expect(result.avgFormatted).toBe("40:00");
    });

    it("should only count weeks with actual work entries", () => {
      // Week 23: Work entry with +30 min
      // Week 24: Only vacation entry (should be excluded from count)
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Week 23: +30 min work
        createEntry("2023-06-12", "", "", "vacation"), // Week 24: vacation only
      ];

      const result = calculateAverageWeeklyHours(entries, defaultSchedule, 40);
      // Only week 23 counts, balance = +30 min
      expect(result.avgMinutes).toBe(2430);
    });

    it("should exclude weeks with only holidays", () => {
      // Week 23: Work entry with +30 min
      // Week 24: Only holiday entry
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Week 23: +30 min work
        createEntry("2023-06-12", "", "", "holiday"), // Week 24: holiday only
      ];

      const result = calculateAverageWeeklyHours(entries, defaultSchedule, 40);
      expect(result.avgMinutes).toBe(2430); // Only week 23 counts
    });

    it("should include week balance from non-work days in weeks with work", () => {
      // Week 23 has: work day (+30 min) + vacation with extra hours (+120 min)
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min work
        createEntry("2023-06-06", "", "", "vacation", 0, 2), // Tue: vacation +2h extra
      ];

      const result = calculateAverageWeeklyHours(entries, defaultSchedule, 40);
      // Week 23 balance = +30 + 120 = +150 min
      expect(result.avgMinutes).toBe(2550); // 40h + 2.5h = 42.5h = 2550 min
    });

    it("should exclude incomplete entries for today", () => {
      const today = new Date("2023-06-06T14:00:00");
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "18:00"), // Mon: +30 min (complete)
        createEntry("2023-06-06", "09:00", "", "work"), // Tue (today): incomplete
      ];

      const result = calculateAverageWeeklyHours(
        entries,
        defaultSchedule,
        40,
        today,
      );
      expect(result.avgMinutes).toBe(2430); // Only counts completed entry
    });
  });

  describe("calculateDayOfWeekStats", () => {
    it("should return empty array for no entries", () => {
      const result = calculateDayOfWeekStats([], defaultSchedule);
      expect(result).toEqual([]);
    });

    it("should calculate stats for each day of week", () => {
      // Two Mondays with different hours
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h
        createEntry("2023-06-12", "09:00", "18:30"), // Mon: 9h
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      expect(monday).toBeDefined();
      expect(monday?.count).toBe(2);
      expect(monday?.avgMinutes).toBe(510); // (480 + 540) / 2 = 510 min = 8.5h
      expect(monday?.minMinutes).toBe(480); // 8h
      expect(monday?.maxMinutes).toBe(540); // 9h
    });

    it("should only include work entries", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: work
        createEntry("2023-06-06", "", "", "vacation"), // Tue: vacation
        createEntry("2023-06-07", "", "", "sick"), // Wed: sick
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      expect(result.length).toBe(1); // Only Monday
      expect(result[0].day).toBe(1);
    });

    it("should only return weekdays (Mon-Fri)", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon
        createEntry("2023-06-10", "09:00", "13:00"), // Sat (should be excluded)
        createEntry("2023-06-11", "09:00", "13:00"), // Sun (should be excluded)
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      expect(result.length).toBe(1);
      expect(result[0].day).toBe(1); // Only Monday
    });

    it("should exclude incomplete entries for today", () => {
      const today = new Date("2023-06-06T14:00:00");
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: complete
        createEntry("2023-06-06", "09:00", "", "work"), // Tue (today): incomplete
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule, today);

      expect(result.length).toBe(1);
      expect(result[0].day).toBe(1); // Only Monday
    });

    it("should include formatted average hours", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      expect(result[0].avgHoursStr).toBe("8:00");
    });

    it("should return median equal to the single value for one entry", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h = 480 min
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      expect(monday?.medianMinutes).toBe(480);
      expect(monday?.medianHoursStr).toBe("8:00");
    });

    it("should return median as average of two middle values for even count", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-12", "09:00", "18:30"), // Mon: 9h = 540 min
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      expect(monday?.medianMinutes).toBe(510); // (480 + 540) / 2
    });

    it("should return the middle value for odd count", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-12", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-19", "09:00", "18:30"), // Mon: 9h = 540 min
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      expect(monday?.medianMinutes).toBe(480);
    });

    it("should be resistant to outliers unlike average", () => {
      // 4 normal 8h days + 1 outlier 12h day
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-12", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-19", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-26", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-07-03", "09:00", "21:30"), // Mon: 12h = 720 min (outlier)
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      // avg = (480*4 + 720) / 5 = 528
      expect(monday?.avgMinutes).toBe(528);
      // median = middle value of [480, 480, 480, 480, 720] = 480
      expect(monday?.medianMinutes).toBe(480);
    });

    it("should include formatted median hours string", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // Mon: 8h = 480 min
        createEntry("2023-06-12", "09:00", "18:30"), // Mon: 9h = 540 min
        createEntry("2023-06-19", "09:00", "19:00"), // Mon: 9.5h = 570 min
      ];

      const result = calculateDayOfWeekStats(entries, defaultSchedule);

      const monday = result.find((d) => d.day === 1);
      expect(monday?.medianMinutes).toBe(540);
      expect(monday?.medianHoursStr).toBe("9:00");
    });
  });

  describe("countSickDays", () => {
    it("should return 0 for empty entries", () => {
      expect(countSickDays([])).toBe(0);
    });

    it("should count sick day entries", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // work
        createEntry("2023-06-06", "", "", "sick"), // sick
        createEntry("2023-06-07", "", "", "sick"), // sick
        createEntry("2023-06-08", "", "", "vacation"), // vacation
      ];

      expect(countSickDays(entries)).toBe(2);
    });

    it("should return 0 when no sick days", () => {
      const entries: DailyEntry[] = [
        createEntry("2023-06-05", "09:00", "17:30"), // work
        createEntry("2023-06-06", "", "", "vacation"), // vacation
      ];

      expect(countSickDays(entries)).toBe(0);
    });
  });
});
