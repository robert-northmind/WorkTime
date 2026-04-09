import {
  VACATION_ICONS,
  getRandomVacationIcon,
  type VacationIcon,
} from "../../../src/services/stats/vacationIcons";

describe("VACATION_ICONS", () => {
  it("contains exactly 4 icons", () => {
    expect(VACATION_ICONS).toHaveLength(4);
  });

  it("each icon has a non-empty key and path", () => {
    for (const icon of VACATION_ICONS) {
      expect(icon.key.length).toBeGreaterThan(0);
      expect(icon.path.length).toBeGreaterThan(0);
    }
  });

  it("all keys are unique", () => {
    const keys = VACATION_ICONS.map((icon) => icon.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("getRandomVacationIcon", () => {
  it("returns an icon from the default list", () => {
    const icon = getRandomVacationIcon();
    expect(VACATION_ICONS).toContainEqual(icon);
  });

  it("returns the only icon when given a single-element list", () => {
    const single: VacationIcon[] = [{ key: "test", path: "M0 0" }];
    expect(getRandomVacationIcon(single)).toEqual(single[0]);
  });

  it("can return different icons across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(getRandomVacationIcon().key);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
