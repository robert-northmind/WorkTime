import {
  getExpectedDailyHours,
  getActiveSchedule,
  WorkSchedule,
} from "../../../src/services/schedule/ScheduleService";

describe("ScheduleService", () => {
  const defaultSchedule: WorkSchedule[] = [
    {
      effectiveDate: "2023-01-01",
      weeklyHours: 40,
      workDays: [1, 2, 3, 4, 5], // Mon-Fri
    },
  ];

  it("returns correct hours for a standard work day", () => {
    // A Monday
    const date = "2023-06-05";
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(8); // 40 / 5
  });

  it("returns 0 for non-work days", () => {
    // A Sunday
    const date = "2023-06-04";
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(0);
  });

  it("handles schedule changes", () => {
    const schedules: WorkSchedule[] = [
      {
        effectiveDate: "2023-01-01",
        weeklyHours: 40,
        workDays: [1, 2, 3, 4, 5],
      },
      {
        effectiveDate: "2023-07-01",
        weeklyHours: 30, // Reduced hours
        workDays: [1, 2, 3, 4], // Mon-Thu
      },
    ];

    // Before change (June)
    expect(getExpectedDailyHours("2023-06-30", schedules)).toBe(8);

    // After change (July)
    // 30 hours / 4 days = 7.5 hours
    expect(getExpectedDailyHours("2023-07-03", schedules)).toBe(7.5);
  });

  it("uses the latest schedule when multiple are active for the date", () => {
    const schedules: WorkSchedule[] = [
      {
        effectiveDate: "2023-01-01",
        weeklyHours: 40,
        workDays: [1, 2, 3, 4, 5],
      },
      {
        effectiveDate: "2023-07-01",
        weeklyHours: 30,
        workDays: [1, 2, 3, 4],
      },
    ];

    // Date in August should use the July schedule (30h / 4 days = 7.5h/day)
    expect(getExpectedDailyHours("2023-08-07", schedules)).toBe(7.5); // Monday
    // Date in June should still use the January schedule (40h / 5 days = 8h/day)
    expect(getExpectedDailyHours("2023-06-05", schedules)).toBe(8); // Monday
  });

  it("returns 0 if no schedule is active yet", () => {
    const date = "2022-12-31";
    const hours = getExpectedDailyHours(date, defaultSchedule);
    expect(hours).toBe(0);
  });

  describe("getActiveSchedule", () => {
    it("returns the schedule that is effective for the given date", () => {
      const schedules: WorkSchedule[] = [
        {
          effectiveDate: "2023-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      const result = getActiveSchedule("2023-06-15", schedules);
      expect(result).toEqual(schedules[0]);
    });

    it("returns undefined if no schedule is active yet", () => {
      const schedules: WorkSchedule[] = [
        {
          effectiveDate: "2024-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      const result = getActiveSchedule("2023-06-15", schedules);
      expect(result).toBeUndefined();
    });

    it("returns the most recent schedule when multiple are active", () => {
      const schedules: WorkSchedule[] = [
        {
          effectiveDate: "2023-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
        {
          effectiveDate: "2023-07-01",
          weeklyHours: 32,
          workDays: [1, 2, 3, 4],
        },
        {
          effectiveDate: "2024-01-01",
          weeklyHours: 36,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      // Date before July 2023 - should get the Jan 2023 schedule
      expect(getActiveSchedule("2023-06-15", schedules)?.weeklyHours).toBe(40);

      // Date after July 2023 - should get the July 2023 schedule
      expect(getActiveSchedule("2023-08-15", schedules)?.weeklyHours).toBe(32);

      // Date after Jan 2024 - should get the Jan 2024 schedule
      expect(getActiveSchedule("2024-02-15", schedules)?.weeklyHours).toBe(36);
    });

    it("returns undefined for empty schedule list", () => {
      const result = getActiveSchedule("2023-06-15", []);
      expect(result).toBeUndefined();
    });

    it("handles exact effective date match", () => {
      const schedules: WorkSchedule[] = [
        {
          effectiveDate: "2023-07-01",
          weeklyHours: 32,
          workDays: [1, 2, 3, 4],
        },
      ];

      const result = getActiveSchedule("2023-07-01", schedules);
      expect(result?.weeklyHours).toBe(32);
    });
  });
});
