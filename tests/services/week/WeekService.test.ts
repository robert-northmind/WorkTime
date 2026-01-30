import {
  fillWeekDays,
  getWeekKey,
} from "../../../src/services/week/WeekService";
import type { FirestoreDailyEntry } from "../../../src/types/firestore";

// Helper to create a mock entry
const createEntry = (date: string, status = "work"): FirestoreDailyEntry => ({
  uid: "test-uid",
  date,
  startTime: "09:00",
  endTime: "17:00",
  lunchMinutes: 30,
  extraHours: 0,
  status,
  notes: "",
  updatedAt: new Date().toISOString(),
});

describe("WeekService", () => {
  describe("fillWeekDays", () => {
    describe("weekday behavior", () => {
      it("should return empty array when no entries provided", () => {
        const result = fillWeekDays([], "2025-W01");
        expect(result).toEqual([]);
      });

      it("should fill weekdays up to today when today is in the week", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-17T12:00:00"); // Wednesday
        const entries = [createEntry("2025-12-15")]; // Monday entry

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should show Mon, Tue, Wed (today) - in descending order
        expect(result).toHaveLength(3);
        expect(result[0].date).toBe("2025-12-17"); // Wed (today)
        expect(result[1].date).toBe("2025-12-16"); // Tue
        expect(result[2].date).toBe("2025-12-15"); // Mon
      });

      it("should show future weekdays if they have entries", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-15T12:00:00"); // Monday
        const entries = [
          createEntry("2025-12-15"), // Monday
          createEntry("2025-12-19", "vacation"), // Friday (future)
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should show Mon (today) and Fri (has entry)
        expect(result).toHaveLength(2);
        expect(result[0].date).toBe("2025-12-19"); // Fri
        expect(result[1].date).toBe("2025-12-15"); // Mon
      });

      it("should show null entry for weekdays without entries", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-17T12:00:00"); // Wednesday
        const entries = [createEntry("2025-12-15")]; // Only Monday has entry

        const result = fillWeekDays(entries, "2025-W51", today);

        expect(result).toHaveLength(3);
        expect(result[0].entry).toBeNull(); // Wed - no entry
        expect(result[1].entry).toBeNull(); // Tue - no entry
        expect(result[2].entry).not.toBeNull(); // Mon - has entry
      });
    });

    describe("weekend behavior", () => {
      it("should NOT show weekend days when they have no entries", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-21T12:00:00"); // Sunday (end of week)
        const entries = [createEntry("2025-12-15")]; // Only Monday has entry

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should only show weekdays Mon-Fri, not Sat/Sun
        expect(result).toHaveLength(5);
        const dates = result.map((r) => r.date);
        expect(dates).not.toContain("2025-12-20"); // Saturday
        expect(dates).not.toContain("2025-12-21"); // Sunday
      });

      it("should show Saturday when it has an entry", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-21T12:00:00"); // Sunday
        const entries = [
          createEntry("2025-12-15"), // Monday
          createEntry("2025-12-20", "holiday"), // Saturday - public holiday
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should show Mon-Fri + Saturday (6 days)
        expect(result).toHaveLength(6);
        const dates = result.map((r) => r.date);
        expect(dates).toContain("2025-12-20"); // Saturday included
        expect(dates).not.toContain("2025-12-21"); // Sunday still excluded
      });

      it("should show Sunday when it has an entry", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-21T12:00:00"); // Sunday
        const entries = [
          createEntry("2025-12-15"), // Monday
          createEntry("2025-12-21", "holiday"), // Sunday - public holiday
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should show Mon-Fri + Sunday (6 days)
        expect(result).toHaveLength(6);
        const dates = result.map((r) => r.date);
        expect(dates).toContain("2025-12-21"); // Sunday included
        expect(dates).not.toContain("2025-12-20"); // Saturday still excluded
      });

      it("should show both Saturday and Sunday when both have entries", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-21T12:00:00"); // Sunday
        const entries = [
          createEntry("2025-12-15"), // Monday
          createEntry("2025-12-20", "holiday"), // Saturday
          createEntry("2025-12-21", "holiday"), // Sunday
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should show all 7 days
        expect(result).toHaveLength(7);
        const dates = result.map((r) => r.date);
        expect(dates).toContain("2025-12-20"); // Saturday
        expect(dates).toContain("2025-12-21"); // Sunday
      });

      it("should show weekend entry even if it is in the future", () => {
        // Week 1 of 2026: Dec 29 2025 (Mon) - Jan 4 2026 (Sun)
        // Note: ISO week 1 of 2026 starts on Dec 29, 2025
        const today = new Date("2025-12-29T12:00:00"); // Monday
        const entries = [
          createEntry("2025-12-29"), // Monday
          createEntry("2026-01-03", "holiday"), // Saturday (future) - e.g., New Year observed
        ];

        const result = fillWeekDays(entries, "2026-W01", today);

        // Should show Monday and Saturday (weekend with entry)
        expect(result).toHaveLength(2);
        const dates = result.map((r) => r.date);
        expect(dates).toContain("2025-12-29"); // Monday
        expect(dates).toContain("2026-01-03"); // Saturday (future but has entry)
      });
    });

    describe("ordering", () => {
      it("should return days in descending order (most recent first)", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-19T12:00:00"); // Friday
        const entries = [
          createEntry("2025-12-15"),
          createEntry("2025-12-17"),
          createEntry("2025-12-19"),
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        expect(result).toHaveLength(5); // Mon-Fri
        // First should be Friday (most recent), last should be Monday
        expect(result[0].date).toBe("2025-12-19");
        expect(result[result.length - 1].date).toBe("2025-12-15");
      });

      it("should place weekend entries in correct position when present", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        const today = new Date("2025-12-21T12:00:00"); // Sunday
        const entries = [
          createEntry("2025-12-15"), // Monday
          createEntry("2025-12-20", "holiday"), // Saturday
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Saturday should be before Friday in descending order
        const satIndex = result.findIndex((r) => r.date === "2025-12-20");
        const friIndex = result.findIndex((r) => r.date === "2025-12-19");
        expect(satIndex).toBeLessThan(friIndex);
      });
    });

    describe("edge cases", () => {
      it("should handle week spanning year boundary", () => {
        // Week 1 of 2026 starts on Dec 29, 2025 (Mon) and ends Jan 4, 2026 (Sun)
        const today = new Date("2026-01-04T12:00:00"); // Sunday
        const entries = [
          createEntry("2025-12-29"), // Monday (Dec 2025)
          createEntry("2026-01-01", "holiday"), // Thursday (Jan 2026) - New Year
          createEntry("2026-01-04", "holiday"), // Sunday (Jan 2026)
        ];

        const result = fillWeekDays(entries, "2026-W01", today);

        // Should show Mon-Fri + Sunday (6 days)
        expect(result).toHaveLength(6);
        const dates = result.map((r) => r.date);
        expect(dates).toContain("2025-12-29"); // Monday in Dec
        expect(dates).toContain("2026-01-01"); // Thursday in Jan
        expect(dates).toContain("2026-01-04"); // Sunday in Jan
      });

      it("should handle week with only weekend entries", () => {
        // Week 51 of 2025: Dec 15 (Mon) - Dec 21 (Sun)
        // Imagine checking a future week where only a holiday was added
        const today = new Date("2025-12-01T12:00:00"); // Before this week
        const entries = [
          createEntry("2025-12-20", "holiday"), // Saturday
        ];

        const result = fillWeekDays(entries, "2025-W51", today);

        // Should only show Saturday (no weekdays since they're all in the future and have no entries)
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe("2025-12-20");
        expect(result[0].entry?.status).toBe("holiday");
      });
    });
  });

  describe("getWeekKey", () => {
    it("should return correct ISO week key for a regular date", () => {
      // January 29, 2026 is a Thursday in week 5
      expect(getWeekKey("2026-01-29")).toBe("2026-W5");
    });

    it("should return correct week key for first week of year", () => {
      // January 1, 2026 is a Thursday in week 1
      expect(getWeekKey("2026-01-01")).toBe("2026-W1");
    });

    it("should handle week spanning year boundary (Dec to Jan)", () => {
      // December 29, 2025 is a Monday in ISO week 1 of 2026
      expect(getWeekKey("2025-12-29")).toBe("2026-W1");
    });

    it("should return correct week for last week of year", () => {
      // December 28, 2025 is a Sunday in week 52 of 2025
      expect(getWeekKey("2025-12-28")).toBe("2025-W52");
    });

    it("should handle mid-year dates correctly", () => {
      // June 15, 2026 is a Monday in week 25
      expect(getWeekKey("2026-06-15")).toBe("2026-W25");
    });

    it("should handle week 53 when it exists", () => {
      // December 31, 2020 is a Thursday in week 53 of 2020
      expect(getWeekKey("2020-12-31")).toBe("2020-W53");
    });
  });
});
