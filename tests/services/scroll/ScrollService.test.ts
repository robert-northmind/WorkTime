import {
  findScrollTargets,
  getWeekNumber,
  WeekGroup,
} from "../../../src/services/scroll/ScrollService";

describe("getWeekNumber", () => {
  it("returns correct week number for a date in early January", () => {
    // Jan 6, 2025 is a Monday in Week 2
    const result = getWeekNumber("2025-01-06");
    expect(result).toEqual({ year: 2025, week: 2 });
  });

  it("returns correct week number for a date in mid-year", () => {
    // July 15, 2024 is in Week 29
    const result = getWeekNumber("2024-07-15");
    expect(result).toEqual({ year: 2024, week: 29 });
  });

  it("handles year boundary correctly (week belongs to previous year)", () => {
    // Dec 30, 2024 is a Monday in Week 1 of 2025 (ISO week)
    const result = getWeekNumber("2024-12-30");
    expect(result).toEqual({ year: 2025, week: 1 });
  });

  it("handles year boundary correctly (week belongs to current year)", () => {
    // Dec 28, 2024 is a Saturday in Week 52 of 2024
    const result = getWeekNumber("2024-12-28");
    expect(result).toEqual({ year: 2024, week: 52 });
  });
});

describe("findScrollTargets", () => {
  const createWeekGroup = (weekKey: string, dates: string[]): WeekGroup => ({
    weekKey,
    weekRange: "Mock Range",
    entries: dates.map((date) => ({ date, entry: null })),
  });

  describe("when viewing a different year", () => {
    it("returns changeYear action", () => {
      const groupedByWeek: WeekGroup[] = [];
      const selectedYear = 2023;
      const todayStr = "2024-12-10";

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result).toEqual({
        action: "changeYear",
        targetYear: 2024,
      });
    });
  });

  describe("when today's entry exists", () => {
    it("returns todayEntry as first target", () => {
      const todayStr = "2024-12-10";
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2024-W50", [
          "2024-12-13",
          "2024-12-12",
          "2024-12-11",
          "2024-12-10",
          "2024-12-09",
        ]),
      ];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets[0]).toEqual({ type: "todayEntry" });
      }
    });

    it("also includes current week header as fallback", () => {
      const todayStr = "2024-12-10";
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2024-W50", [
          "2024-12-13",
          "2024-12-12",
          "2024-12-11",
          "2024-12-10",
          "2024-12-09",
        ]),
      ];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets).toHaveLength(2);
        expect(result.targets[1]).toEqual({
          type: "weekHeader",
          weekKey: "2024-W50",
        });
      }
    });
  });

  describe("when today is a weekend (no entry row exists)", () => {
    it("returns current week header if the week exists", () => {
      // Saturday Dec 14, 2024 - no row for today but week 50 has entries
      const todayStr = "2024-12-14";
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2024-W50", [
          "2024-12-13",
          "2024-12-12",
          "2024-12-11",
          "2024-12-10",
          "2024-12-09",
        ]),
      ];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets).toHaveLength(1);
        expect(result.targets[0]).toEqual({
          type: "weekHeader",
          weekKey: "2024-W50",
        });
      }
    });
  });

  describe("when current week has no entries", () => {
    it("returns nearest past week header", () => {
      // Today is in Week 50, but only Week 49 and Week 48 have entries
      const todayStr = "2024-12-10"; // Week 50
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2024-W49", [
          "2024-12-06",
          "2024-12-05",
          "2024-12-04",
          "2024-12-03",
          "2024-12-02",
        ]),
        createWeekGroup("2024-W48", ["2024-11-29", "2024-11-28"]),
      ];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets).toHaveLength(1);
        expect(result.targets[0]).toEqual({
          type: "weekHeader",
          weekKey: "2024-W49",
        });
      }
    });

    it("skips future weeks when finding nearest past week", () => {
      // Today is Week 50, entries exist for Week 51 (future) and Week 48 (past)
      const todayStr = "2024-12-10"; // Week 50
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2024-W51", ["2024-12-20", "2024-12-19"]), // Future week
        createWeekGroup("2024-W48", ["2024-11-29", "2024-11-28"]),
      ];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets).toHaveLength(1);
        expect(result.targets[0]).toEqual({
          type: "weekHeader",
          weekKey: "2024-W48",
        });
      }
    });
  });

  describe("when no entries exist at all", () => {
    it("returns empty targets array", () => {
      const todayStr = "2024-12-10";
      const groupedByWeek: WeekGroup[] = [];
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        expect(result.targets).toHaveLength(0);
      }
    });
  });

  describe("year boundary handling", () => {
    it("handles when today is in a week that spans years", () => {
      // Dec 30, 2024 is in ISO Week 1 of 2025
      const todayStr = "2024-12-30";
      const groupedByWeek: WeekGroup[] = [
        createWeekGroup("2025-W1", ["2024-12-30", "2024-12-31"]),
        createWeekGroup("2024-W52", ["2024-12-27", "2024-12-26"]),
      ];
      // Selected year is 2024, but today's ISO week is 2025-W1
      // This should still work because we're comparing the ISO week, not the calendar year
      const selectedYear = 2024;

      const result = findScrollTargets(groupedByWeek, selectedYear, todayStr);

      expect(result.action).toBe("scroll");
      if (result.action === "scroll") {
        // Today entry exists
        expect(result.targets[0]).toEqual({ type: "todayEntry" });
        // Week header for 2025-W1
        expect(result.targets[1]).toEqual({
          type: "weekHeader",
          weekKey: "2025-W1",
        });
      }
    });
  });
});
