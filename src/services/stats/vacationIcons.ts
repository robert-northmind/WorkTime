export interface VacationIcon {
  key: string;
  path: string;
}

export const VACATION_ICONS: readonly VacationIcon[] = [
  {
    key: "sun",
    path: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    key: "palm",
    path: "M12 22V12m0 0c-2-4-6-5-9-4m9 4c2-4 6-5 9-4M12 12c-1.5-4.5 1-8 4-10m-4 10c1.5-4.5-1-8-4-10",
  },
  {
    key: "plane",
    path: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1.064M12 3l2.559 4.473M12 3L9.441 7.473M12 3v18m5.745-3.473L15 13h2a2 2 0 002-2V9.5M6.255 17.527L9 13H7a2 2 0 01-2-2V9.5",
  },
  {
    key: "umbrella",
    path: "M12 22V13m0-9a8 8 0 00-8 8h16a8 8 0 00-8-8zm-5 17h10",
  },
];

export function getRandomVacationIcon(
  icons: readonly VacationIcon[] = VACATION_ICONS
): VacationIcon {
  return icons[Math.floor(Math.random() * icons.length)];
}
