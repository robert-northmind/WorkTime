import type { FirestoreDailyEntry } from "../../types/firestore";

export interface WeekDayEntry {
  date: string;
  entry: FirestoreDailyEntry | null;
}

/**
 * Fills in all days for a given week, including:
 * - Weekdays (Mon-Fri): shown if <= today or have an entry
 * - Weekends (Sat-Sun): only shown if they have an entry
 *
 * @param weekEntries - The entries that exist for this week
 * @param weekKey - The week key in format "YYYY-WNN" (e.g., "2025-W47")
 * @param today - Optional today's date for testing (defaults to current date)
 * @returns Array of days in descending order (most recent first)
 */
export const fillWeekDays = (
  weekEntries: FirestoreDailyEntry[],
  weekKey: string,
  today: Date = new Date()
): WeekDayEntry[] => {
  if (weekEntries.length === 0) return [];

  // Parse week key to get year and week number (e.g., "2025-W47")
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekStr);

  // Calculate Monday of this ISO week
  // Simple algorithm: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday (0) to 7

  // Find Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayOfWeek + 1);

  // Calculate Monday of the target week
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);

  // Create map of existing entries
  const entryMap = new Map<string, FirestoreDailyEntry>();
  weekEntries.forEach((entry) => entryMap.set(entry.date, entry));

  // Fill all days of the week (Mon-Sun = 7 days)
  // Weekdays (Mon-Fri) are always shown if <= today or have an entry
  // Weekends (Sat-Sun) are only shown if they have an entry
  const allDays: WeekDayEntry[] = [];

  // Get today's date string for comparison (avoids timezone issues)
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build days in ascending order first (Mon to Sun)
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(
      Date.UTC(
        monday.getUTCFullYear(),
        monday.getUTCMonth(),
        monday.getUTCDate() + i
      )
    );
    const dateStr = currentDay.toISOString().split("T")[0];
    const isWeekend = i >= 5; // Saturday (5) or Sunday (6)

    if (isWeekend) {
      // Only include weekend days if they have an entry
      if (entryMap.has(dateStr)) {
        allDays.push({ date: dateStr, entry: entryMap.get(dateStr)! });
      }
    } else {
      // Weekdays: include if on or before today, or have an entry
      // Compare date strings to avoid timezone issues
      if (dateStr <= todayStr || entryMap.has(dateStr)) {
        allDays.push({ date: dateStr, entry: entryMap.get(dateStr) || null });
      }
    }
  }

  // Reverse to show most recent first (descending order)
  return allDays.reverse();
};
