import {
  VACATION_ICON_NAMES,
  getRandomVacationIconName,
} from "../../../src/services/stats/vacationIcons";

describe("VACATION_ICON_NAMES", () => {
  it("contains exactly 4 icons", () => {
    expect(VACATION_ICON_NAMES).toHaveLength(4);
  });

  it("each name is a non-empty string", () => {
    for (const name of VACATION_ICON_NAMES) {
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("all names are unique", () => {
    expect(new Set(VACATION_ICON_NAMES).size).toBe(VACATION_ICON_NAMES.length);
  });
});

describe("getRandomVacationIconName", () => {
  it("returns a name from the default list", () => {
    const name = getRandomVacationIconName();
    expect(VACATION_ICON_NAMES).toContain(name);
  });

  it("returns the only name when given a single-element list", () => {
    expect(getRandomVacationIconName(["Only"])).toBe("Only");
  });

  it("can return different names across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(getRandomVacationIconName());
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
