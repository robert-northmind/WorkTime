import {
  formatTimeDisplay,
  parseTimeInput,
  getTimeInputValue,
} from "../../../src/services/time/TimeFormatService";

describe("TimeFormatService", () => {
  describe("formatTimeDisplay", () => {
    describe("24-hour format", () => {
      it("returns time as-is for 24h format", () => {
        expect(formatTimeDisplay("13:30", "24h")).toBe("13:30");
        expect(formatTimeDisplay("09:00", "24h")).toBe("09:00");
        expect(formatTimeDisplay("23:59", "24h")).toBe("23:59");
        expect(formatTimeDisplay("00:00", "24h")).toBe("00:00");
      });

      it("uses 24h as default format", () => {
        expect(formatTimeDisplay("13:30")).toBe("13:30");
        expect(formatTimeDisplay("09:00")).toBe("09:00");
      });
    });

    describe("12-hour format", () => {
      it("converts morning times to AM", () => {
        expect(formatTimeDisplay("00:00", "12h")).toBe("12:00 AM");
        expect(formatTimeDisplay("01:30", "12h")).toBe("1:30 AM");
        expect(formatTimeDisplay("09:00", "12h")).toBe("9:00 AM");
        expect(formatTimeDisplay("11:59", "12h")).toBe("11:59 AM");
      });

      it("converts afternoon/evening times to PM", () => {
        expect(formatTimeDisplay("12:00", "12h")).toBe("12:00 PM");
        expect(formatTimeDisplay("13:30", "12h")).toBe("1:30 PM");
        expect(formatTimeDisplay("17:00", "12h")).toBe("5:00 PM");
        expect(formatTimeDisplay("23:59", "12h")).toBe("11:59 PM");
      });

      it("handles noon and midnight correctly", () => {
        expect(formatTimeDisplay("00:00", "12h")).toBe("12:00 AM"); // Midnight
        expect(formatTimeDisplay("12:00", "12h")).toBe("12:00 PM"); // Noon
      });
    });

    describe("edge cases", () => {
      it('returns "--:--" for null or undefined', () => {
        expect(formatTimeDisplay(null, "24h")).toBe("--:--");
        expect(formatTimeDisplay(undefined, "24h")).toBe("--:--");
        expect(formatTimeDisplay(null, "12h")).toBe("--:--");
        expect(formatTimeDisplay(undefined, "12h")).toBe("--:--");
      });

      it('returns "--:--" for empty string', () => {
        expect(formatTimeDisplay("", "24h")).toBe("--:--");
        expect(formatTimeDisplay("", "12h")).toBe("--:--");
      });

      it('returns "--:--" for invalid time format', () => {
        expect(formatTimeDisplay("invalid", "12h")).toBe("--:--");
        expect(formatTimeDisplay("25:00", "12h")).toBe("--:--"); // Invalid hour range
        expect(formatTimeDisplay("-1:00", "12h")).toBe("--:--"); // Negative hour
      });
    });
  });

  describe("parseTimeInput", () => {
    describe("24-hour format input", () => {
      it("returns 24h format as-is", () => {
        expect(parseTimeInput("13:30")).toBe("13:30");
        expect(parseTimeInput("09:00")).toBe("09:00");
        expect(parseTimeInput("00:00")).toBe("00:00");
        expect(parseTimeInput("23:59")).toBe("23:59");
      });
    });

    describe("12-hour format input", () => {
      it("converts AM times to 24h format", () => {
        expect(parseTimeInput("1:30 AM")).toBe("01:30");
        expect(parseTimeInput("9:00 AM")).toBe("09:00");
        expect(parseTimeInput("11:59 AM")).toBe("11:59");
      });

      it("converts PM times to 24h format", () => {
        expect(parseTimeInput("1:30 PM")).toBe("13:30");
        expect(parseTimeInput("5:00 PM")).toBe("17:00");
        expect(parseTimeInput("11:59 PM")).toBe("23:59");
      });

      it("handles midnight (12:00 AM) correctly", () => {
        expect(parseTimeInput("12:00 AM")).toBe("00:00");
        expect(parseTimeInput("12:30 AM")).toBe("00:30");
      });

      it("handles noon (12:00 PM) correctly", () => {
        expect(parseTimeInput("12:00 PM")).toBe("12:00");
        expect(parseTimeInput("12:30 PM")).toBe("12:30");
      });

      it("handles case-insensitive AM/PM", () => {
        expect(parseTimeInput("1:30 am")).toBe("01:30");
        expect(parseTimeInput("1:30 pm")).toBe("13:30");
        expect(parseTimeInput("1:30 Am")).toBe("01:30");
        expect(parseTimeInput("1:30 Pm")).toBe("13:30");
      });
    });

    describe("edge cases", () => {
      it("returns empty string for null, undefined, or empty input", () => {
        expect(parseTimeInput("")).toBe("");
        expect(parseTimeInput("   ")).toBe("");
      });

      it("returns input as-is for unrecognized formats", () => {
        expect(parseTimeInput("invalid")).toBe("invalid");
        expect(parseTimeInput("25:00")).toBe("25:00");
      });
    });
  });

  describe("getTimeInputValue", () => {
    it("returns the time string if provided", () => {
      expect(getTimeInputValue("13:30")).toBe("13:30");
      expect(getTimeInputValue("09:00")).toBe("09:00");
    });

    it("returns empty string for null (controlled input compatibility)", () => {
      expect(getTimeInputValue(null)).toBe("");
    });

    it("returns empty string for undefined (controlled input compatibility)", () => {
      expect(getTimeInputValue(undefined)).toBe("");
    });

    it("returns empty string for empty string (controlled input compatibility)", () => {
      expect(getTimeInputValue("")).toBe("");
    });
  });
});
