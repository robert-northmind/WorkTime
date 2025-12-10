/**
 * ScrollService - Pure functions for determining scroll targets
 *
 * This service handles the logic for finding what element to scroll to,
 * keeping the DOM interaction separate from the decision logic.
 */

export interface WeekGroup {
  weekKey: string; // e.g., "2024-W50"
  weekRange: string;
  entries: { date: string; entry: unknown | null }[];
}

export type ScrollTarget =
  | { type: "todayEntry" }
  | { type: "weekHeader"; weekKey: string };

export type ScrollTargetResult =
  | { action: "changeYear"; targetYear: number }
  | { action: "scroll"; targets: ScrollTarget[] };

/**
 * Get ISO week number for a date string
 */
export const getWeekNumber = (
  dateStr: string
): { year: number; week: number } => {
  const date = new Date(dateStr + "T00:00:00");
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: d.getUTCFullYear(), week: weekNo };
};

/**
 * Determines the scroll targets to try when the user clicks "Today"
 *
 * @param groupedByWeek - The weeks currently displayed, sorted descending by date
 * @param selectedYear - The currently selected year in the UI
 * @param todayStr - Today's date as ISO string (YYYY-MM-DD)
 * @returns Either an action to change year, or a list of scroll targets to try in order
 */
export function findScrollTargets(
  groupedByWeek: WeekGroup[],
  selectedYear: number,
  todayStr: string
): ScrollTargetResult {
  const todayDate = new Date(todayStr + "T00:00:00");
  const currentYear = todayDate.getFullYear();

  // If viewing a different year, need to switch first
  if (selectedYear !== currentYear) {
    return { action: "changeYear", targetYear: currentYear };
  }

  const { year: todayYear, week: todayWeek } = getWeekNumber(todayStr);
  const todayWeekKey = `${todayYear}-W${todayWeek}`;

  const targets: ScrollTarget[] = [];

  // 1. First priority: today's entry row
  // Check if any week has today's date in its entries
  const hasTodayEntry = groupedByWeek.some((week) =>
    week.entries.some((e) => e.date === todayStr)
  );
  if (hasTodayEntry) {
    targets.push({ type: "todayEntry" });
  }

  // 2. Second priority: current week header
  const hasCurrentWeek = groupedByWeek.some(
    (week) => week.weekKey === todayWeekKey
  );
  if (hasCurrentWeek) {
    targets.push({ type: "weekHeader", weekKey: todayWeekKey });
  }

  // 3. Third priority: nearest past week
  // groupedByWeek is sorted descending, so find the first week before today's week
  for (const week of groupedByWeek) {
    const [weekYearStr, weekNumStr] = week.weekKey.split("-W");
    const weekYear = parseInt(weekYearStr, 10);
    const weekNum = parseInt(weekNumStr, 10);

    // Check if this week is before today's week
    if (
      weekYear < todayYear ||
      (weekYear === todayYear && weekNum < todayWeek)
    ) {
      // Only add if not already in targets
      if (
        !targets.some(
          (t) => t.type === "weekHeader" && t.weekKey === week.weekKey
        )
      ) {
        targets.push({ type: "weekHeader", weekKey: week.weekKey });
      }
      break; // Only need the first (most recent) past week
    }
  }

  return { action: "scroll", targets };
}
