export const VACATION_ICON_NAMES = [
  "Sun",
  "Palmtree",
  "Plane",
  "Sailboat",
  "Waves",
  "TentTree",
  "Luggage",
  "Sunset",
  "Globe",
  "Compass",
] as const;

export type VacationIconName = (typeof VACATION_ICON_NAMES)[number];

export function getRandomVacationIconName(
  names: readonly string[] = VACATION_ICON_NAMES
): string {
  return names[Math.floor(Math.random() * names.length)];
}
