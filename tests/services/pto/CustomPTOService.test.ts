import type {
  CustomPTOType,
  FirestoreDailyEntry,
  UserDocument,
} from "../../../src/types/firestore";
import {
  ALL_YEARS_END,
  ALL_YEARS_START,
  archiveCustomPTOType,
  buildReassignOptions,
  calculatePTOUsage,
  fetchPTOUsage,
  getStatusLabel,
  persistCustomPTOSettings,
  reassignEntriesStatus,
  removeCustomPTOType,
  restoreCustomPTOType,
} from "../../../src/services/pto/CustomPTOService";

const baseEntry: FirestoreDailyEntry = {
  uid: "u1",
  date: "2024-01-10",
  startTime: "",
  endTime: "",
  lunchMinutes: 0,
  extraHours: 0,
  status: "work",
  notes: "",
  updatedAt: "2024-01-10T00:00:00.000Z",
};

const baseCustomPTO: CustomPTOType[] = [
  { id: "c1", name: "Custom One", color: "#111111" },
  { id: "c2", name: "Custom Two", color: "#222222", archived: true },
  { id: "c3", name: "Custom Three", color: "#333333" },
];

const fallbackSettings: UserDocument["settings"] = {
  schedules: [],
  vacation: {
    yearStartMonth: 1,
    yearStartDay: 1,
    allowanceDays: 25,
    yearlyAllowances: {},
  },
  yearlyComments: {},
  yearlyMilestones: {},
  customPTO: [],
  ptoColors: {},
  timeFormat: "24h",
};

describe("CustomPTOService", () => {
  describe("getStatusLabel", () => {
    it("returns built-in status labels", () => {
      expect(getStatusLabel("work", baseCustomPTO)).toBe("Work");
      expect(getStatusLabel("vacation", baseCustomPTO)).toBe("Vacation");
      expect(getStatusLabel("grafana-day", baseCustomPTO)).toBe("Grafana Day");
    });

    it("returns custom type name when available", () => {
      expect(getStatusLabel("c1", baseCustomPTO)).toBe("Custom One");
    });

    it("returns raw id when status is unknown", () => {
      expect(getStatusLabel("unknown-status", baseCustomPTO)).toBe(
        "unknown-status"
      );
    });
  });

  describe("calculatePTOUsage", () => {
    it("returns affected entries and yearly counts sorted by year", () => {
      const entries: FirestoreDailyEntry[] = [
        { ...baseEntry, date: "2024-02-01", status: "c1" },
        { ...baseEntry, date: "2023-03-01", status: "c1" },
        { ...baseEntry, date: "2023-04-01", status: "c1" },
        { ...baseEntry, date: "2025-01-01", status: "vacation" },
      ];

      const usage = calculatePTOUsage(entries, "c1");

      expect(usage.affectedEntries).toHaveLength(3);
      expect(usage.yearlyCounts).toEqual([
        { year: "2023", count: 2 },
        { year: "2024", count: 1 },
      ]);
    });

    it("returns empty usage when no entries match the type", () => {
      const usage = calculatePTOUsage(
        [{ ...baseEntry, date: "2024-02-01", status: "vacation" }],
        "c1"
      );

      expect(usage.affectedEntries).toEqual([]);
      expect(usage.yearlyCounts).toEqual([]);
    });
  });

  describe("fetchPTOUsage", () => {
    it("fetches all years and delegates to usage calculation", async () => {
      const getEntriesFn = jest.fn().mockResolvedValue([
        { ...baseEntry, status: "c1", date: "2024-01-01" },
      ]);

      const usage = await fetchPTOUsage("u1", "c1", getEntriesFn);

      expect(getEntriesFn).toHaveBeenCalledWith("u1", ALL_YEARS_START, ALL_YEARS_END);
      expect(usage.affectedEntries).toHaveLength(1);
      expect(usage.yearlyCounts).toEqual([{ year: "2024", count: 1 }]);
    });
  });

  describe("custom type transforms", () => {
    it("archives only the selected custom type", () => {
      const next = archiveCustomPTOType(baseCustomPTO, "c1");
      expect(next.find((pto) => pto.id === "c1")?.archived).toBe(true);
      expect(next.find((pto) => pto.id === "c3")?.archived).toBeUndefined();
    });

    it("restores only the selected custom type", () => {
      const next = restoreCustomPTOType(baseCustomPTO, "c2");
      expect(next.find((pto) => pto.id === "c2")?.archived).toBe(false);
    });

    it("removes only the selected custom type", () => {
      const next = removeCustomPTOType(baseCustomPTO, "c2");
      expect(next.map((pto) => pto.id)).toEqual(["c1", "c3"]);
    });
  });

  describe("reassignEntriesStatus", () => {
    it("reassigns all entry statuses while preserving other fields", () => {
      const entries: FirestoreDailyEntry[] = [
        { ...baseEntry, status: "c1", date: "2024-01-01", notes: "a" },
        { ...baseEntry, status: "c1", date: "2024-01-02", notes: "b" },
      ];

      const reassigned = reassignEntriesStatus(entries, "vacation");

      expect(reassigned.map((entry) => entry.status)).toEqual([
        "vacation",
        "vacation",
      ]);
      expect(reassigned[0].notes).toBe("a");
      expect(reassigned[1].date).toBe("2024-01-02");
    });
  });

  describe("buildReassignOptions", () => {
    it("includes fixed statuses and only active custom types excluding the deleted one", () => {
      const options = buildReassignOptions(baseCustomPTO, "c1");
      expect(options).toEqual([
        { id: "work", label: "Work" },
        { id: "vacation", label: "Vacation" },
        { id: "holiday", label: "Holiday" },
        { id: "sick", label: "Sick" },
        { id: "c3", label: "Custom Three" },
      ]);
    });
  });

  describe("persistCustomPTOSettings", () => {
    it("uses latest user document when available and overwrites only customPTO", async () => {
      const getUserFn = jest.fn().mockResolvedValue({
        uid: "u1",
        email: "latest@example.com",
        createdAt: "2020-01-01T00:00:00.000Z",
        settings: {
          ...fallbackSettings,
          timeFormat: "12h",
          customPTO: [{ id: "old", name: "Old", color: "#fff" }],
        },
      } as UserDocument);
      const saveUserFn = jest.fn().mockResolvedValue(undefined);
      const nextCustomPTO = [{ id: "new", name: "New", color: "#000" }];

      await persistCustomPTOSettings({
        uid: "u1",
        currentEmail: "current@example.com",
        nextCustomPTO,
        fallbackSettings,
        getUserFn,
        saveUserFn,
      });

      expect(saveUserFn).toHaveBeenCalledWith({
        uid: "u1",
        email: "latest@example.com",
        createdAt: "2020-01-01T00:00:00.000Z",
        settings: {
          ...fallbackSettings,
          timeFormat: "12h",
          customPTO: nextCustomPTO,
        },
      });
    });

    it("falls back to provided defaults when latest user does not exist", async () => {
      const getUserFn = jest.fn().mockResolvedValue(null);
      const saveUserFn = jest.fn().mockResolvedValue(undefined);

      await persistCustomPTOSettings({
        uid: "u1",
        currentEmail: "current@example.com",
        nextCustomPTO: [{ id: "n1", name: "N1", color: "#aaa" }],
        fallbackSettings,
        getUserFn,
        saveUserFn,
        nowIso: "2026-02-23T00:00:00.000Z",
      });

      expect(saveUserFn).toHaveBeenCalledWith({
        uid: "u1",
        email: "current@example.com",
        createdAt: "2026-02-23T00:00:00.000Z",
        settings: {
          ...fallbackSettings,
          customPTO: [{ id: "n1", name: "N1", color: "#aaa" }],
        },
      });
    });
  });
});
