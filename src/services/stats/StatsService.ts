import {
  calculateDailyBalance,
  shouldExcludeFromBalance,
  type DailyEntry,
} from "../balance/BalanceService";
import { type WorkSchedule } from "../schedule/ScheduleService";
import { formatHours } from "../time/TimeService";
import { getWeekKey } from "../week/WeekService";

export interface YearlyBalanceResult {
  balanceMinutes: number;
  balanceFormatted: string;
}

export interface AverageWeeklyHoursResult {
  avgMinutes: number;
  avgFormatted: string;
}

export interface DayOfWeekStat {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  name: string;
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  avgHoursStr: string;
  count: number;
}

/**
 * Calculates the total yearly balance by summing all entry balances.
 * Excludes incomplete entries for today.
 */
export const calculateYearlyBalance = (
  entries: DailyEntry[],
  schedules: WorkSchedule[],
  referenceDate: Date = new Date(),
): YearlyBalanceResult => {
  let totalBalanceMinutes = 0;

  entries.forEach((entry) => {
    if (shouldExcludeFromBalance(entry, referenceDate)) {
      return;
    }
    const result = calculateDailyBalance(entry, schedules);
    totalBalanceMinutes += result.balanceMinutes;
  });

  return {
    balanceMinutes: totalBalanceMinutes,
    balanceFormatted: formatHours(totalBalanceMinutes),
  };
};

/**
 * Calculates the average weekly hours based on entries.
 * Only counts weeks that have at least one work entry with actual hours.
 * Returns expected weekly hours + average weekly balance.
 */
export const calculateAverageWeeklyHours = (
  entries: DailyEntry[],
  schedules: WorkSchedule[],
  expectedWeeklyHours: number,
  referenceDate: Date = new Date(),
): AverageWeeklyHoursResult => {
  const expectedWeeklyMinutes = expectedWeeklyHours * 60;

  if (entries.length === 0) {
    return {
      avgMinutes: expectedWeeklyMinutes,
      avgFormatted: formatHours(expectedWeeklyMinutes),
    };
  }

  // Track weekly balances and weeks with actual work
  const weeklyBalances = new Map<string, number>();
  const weeksWithWork = new Set<string>();

  entries.forEach((entry) => {
    if (shouldExcludeFromBalance(entry, referenceDate)) {
      return;
    }

    const weekKey = getWeekKey(entry.date);
    const result = calculateDailyBalance(entry, schedules);

    if (!weeklyBalances.has(weekKey)) {
      weeklyBalances.set(weekKey, 0);
    }
    weeklyBalances.set(
      weekKey,
      weeklyBalances.get(weekKey)! + result.balanceMinutes,
    );

    // Track if this week has actual work with hours logged
    if (entry.status === "work" && result.actualMinutes > 0) {
      weeksWithWork.add(weekKey);
    }
  });

  const weekCount = weeksWithWork.size;
  if (weekCount === 0) {
    return {
      avgMinutes: expectedWeeklyMinutes,
      avgFormatted: formatHours(expectedWeeklyMinutes),
    };
  }

  // Sum balances only from weeks that have work entries
  const totalWeeklyBalance = Array.from(weeksWithWork).reduce(
    (sum, weekKey) => sum + (weeklyBalances.get(weekKey) || 0),
    0,
  );

  const avgWeeklyBalanceMinutes = totalWeeklyBalance / weekCount;
  const avgMinutes = expectedWeeklyMinutes + avgWeeklyBalanceMinutes;

  return {
    avgMinutes,
    avgFormatted: formatHours(Math.round(avgMinutes)),
  };
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calculates statistics for each day of the week (Mon-Fri only).
 * Returns avg, min, max worked minutes per day.
 */
export const calculateDayOfWeekStats = (
  entries: DailyEntry[],
  schedules: WorkSchedule[],
  referenceDate: Date = new Date(),
): DayOfWeekStat[] => {
  if (entries.length === 0) {
    return [];
  }

  const dayMap = new Map<number, number[]>();

  entries.forEach((entry) => {
    // Only include work entries
    if (entry.status !== "work") return;
    // Exclude incomplete entries for today
    if (shouldExcludeFromBalance(entry, referenceDate)) return;

    const date = new Date(entry.date + "T00:00:00");
    const day = date.getDay();
    const result = calculateDailyBalance(entry, schedules);

    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day)!.push(result.actualMinutes);
  });

  const dayStats: DayOfWeekStat[] = [];

  DAY_NAMES.forEach((name, index) => {
    const minutes = dayMap.get(index) || [];
    const count = minutes.length;

    // Only include weekdays (Mon-Fri = 1-5) with data
    if (index < 1 || index > 5 || count === 0) return;

    const avgMinutes =
      count > 0 ? minutes.reduce((a, b) => a + b, 0) / count : 0;
    const minMinutes = count > 0 ? Math.min(...minutes) : 0;
    const maxMinutes = count > 0 ? Math.max(...minutes) : 0;

    dayStats.push({
      day: index,
      name,
      avgMinutes,
      minMinutes,
      maxMinutes,
      avgHoursStr: formatHours(Math.round(avgMinutes)),
      count,
    });
  });

  return dayStats;
};

/**
 * Counts the number of sick day entries.
 */
export const countSickDays = (entries: DailyEntry[]): number => {
  return entries.filter((entry) => entry.status === "sick").length;
};
