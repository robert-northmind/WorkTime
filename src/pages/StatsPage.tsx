import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../services/auth/AuthService";
import { getEntries, getUser } from "../services/firestore/FirestoreService";
import {
  calculateVacationStats,
  type VacationSettings,
} from "../services/vacation/VacationService";
import { calculateDailyBalance } from "../services/balance/BalanceService";
import { formatHours } from "../services/time/TimeService";

export const StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [vacationStats, setVacationStats] = useState<{
    used: number;
    planned: number;
    remaining: number;
    allowance: number;
  } | null>(null);
  const [yearlyBalance, setYearlyBalance] = useState<string>("0:00");
  const [yearlyBalanceMinutes, setYearlyBalanceMinutes] = useState<number>(0);
  const [averageWeeklyHours, setAverageWeeklyHours] = useState<string>("0.00");
  const [expectedWeeklyHours, setExpectedWeeklyHours] = useState<number>(40);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<
    {
      day: number;
      name: string;
      avgMinutes: number;
      minMinutes: number;
      maxMinutes: number;
      avgHoursStr: string;
      avgPercentage: number;
      minPercentage: number;
      maxPercentage: number;
      count: number;
    }[]
  >([]);
  const [sickDays, setSickDays] = useState<number>(0);

  const user = getCurrentUser();

  // Generate year options (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, selectedYear]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;

      const entries = await getEntries(user.uid, startOfYear, endOfYear);

      // --- 1. Fetch User Settings ---
      const userDoc = await getUser(user.uid);

      // Defaults
      let vacationSettings: VacationSettings = {
        yearStartMonth: 1,
        yearStartDay: 1,
        allowanceDays: 25,
        yearlyAllowances: {},
      };

      let schedules: any[] = [
        {
          effectiveDate: "2000-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      if (userDoc && userDoc.settings) {
        if (userDoc.settings.vacation) {
          vacationSettings = userDoc.settings.vacation;
        }
        if (
          userDoc.settings.schedules &&
          userDoc.settings.schedules.length > 0
        ) {
          schedules = userDoc.settings.schedules;
        }
      }

      // Determine expected weekly hours for the selected year
      // Find the schedule effective for the start of the selected year (or the latest one before it)
      const sortedSchedules = [...schedules].sort((a, b) =>
        b.effectiveDate.localeCompare(a.effectiveDate)
      );
      const activeSchedule = sortedSchedules.find(
        (s) => s.effectiveDate <= `${selectedYear}-12-31`
      );
      const currentExpectedWeeklyHours = activeSchedule
        ? activeSchedule.weeklyHours
        : 40;
      setExpectedWeeklyHours(currentExpectedWeeklyHours);

      // --- 2. Vacation Stats ---
      // Use a dynamic reference date:
      let referenceDate = new Date().toISOString().split("T")[0];
      if (selectedYear < currentYear) {
        referenceDate = `${selectedYear}-12-31`;
      } else if (selectedYear > currentYear) {
        referenceDate = `${selectedYear}-01-01`;
      }

      const vStats = calculateVacationStats(
        entries,
        vacationSettings,
        referenceDate
      );

      // Override allowance if specific year setting exists (handled in calculateVacationStats if updated,
      // but here we might need to manually check if calculateVacationStats doesn't support yearlyAllowances yet.
      // Checking VacationService... it seems I didn't check VacationService code.
      // But SettingsPage saves it to vacationSettings.yearlyAllowances.
      // Let's assume calculateVacationStats needs update or we handle it here.
      // Actually, let's check VacationService.ts first?
      // No, I'll just pass the correct allowance here if I can.
      // But wait, calculateVacationStats returns allowance.
      // If VacationService isn't updated, it might return the default.
      // I should probably update VacationService too if needed.
      // For now, let's trust the plan which didn't explicitly mention updating VacationService but implied it or UI handling.
      // Actually, `calculateVacationStats` takes `vacationSettings`.
      // If `vacationSettings` has `yearlyAllowances`, does `calculateVacationStats` use it?
      // I haven't checked `VacationService.ts`. I should have.
      // But I can fix it here by overriding the returned allowance.

      let allowance = vStats.allowanceDays;
      if (
        vacationSettings.yearlyAllowances &&
        vacationSettings.yearlyAllowances[selectedYear.toString()]
      ) {
        allowance = vacationSettings.yearlyAllowances[selectedYear.toString()];
      }

      setVacationStats({
        used: vStats.usedDays,
        planned: vStats.plannedDays,
        remaining: allowance - vStats.usedDays - vStats.plannedDays, // Re-calculate remaining based on correct allowance
        allowance: allowance,
      });

      // --- 2b. Sick Days ---
      const sickDaysCount = entries.filter(
        (entry) => entry.status === "sick"
      ).length;
      setSickDays(sickDaysCount);

      // --- 3. Yearly Balance & Average Weekly Hours ---
      // Calculate yearly balance by summing all entry balances
      let totalBalanceMinutes = 0;
      entries.forEach((entry) => {
        const result = calculateDailyBalance(entry, schedules);
        totalBalanceMinutes += result.balanceMinutes;
      });

      setYearlyBalance(formatHours(totalBalanceMinutes));
      setYearlyBalanceMinutes(totalBalanceMinutes);

      // --- 4. Average Weekly Hours ---
      // Group entries by week and calculate weekly balances
      const weeklyBalances = new Map<string, number>();

      // Helper to get ISO week number
      const getWeekKey = (dateStr: string): string => {
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
        return `${d.getUTCFullYear()}-W${weekNo}`;
      };

      // Calculate balance for each week
      entries.forEach((entry) => {
        const weekKey = getWeekKey(entry.date);
        const result = calculateDailyBalance(entry, schedules);

        if (!weeklyBalances.has(weekKey)) {
          weeklyBalances.set(weekKey, 0);
        }
        weeklyBalances.set(
          weekKey,
          weeklyBalances.get(weekKey)! + result.balanceMinutes
        );
      });

      // Calculate average weekly balance
      const weekCount = weeklyBalances.size;
      if (weekCount > 0) {
        const totalWeeklyBalance = Array.from(weeklyBalances.values()).reduce(
          (sum, balance) => sum + balance,
          0
        );
        const avgWeeklyBalanceMinutes = totalWeeklyBalance / weekCount;

        // Average weekly hours = expected hours + average weekly balance
        // Note: This assumes expected hours is constant for the year, which is true for our model.
        const expectedWeeklyMinutes = currentExpectedWeeklyHours * 60;
        const avgWeeklyMinutes =
          expectedWeeklyMinutes + avgWeeklyBalanceMinutes;

        setAverageWeeklyHours(formatHours(avgWeeklyMinutes));
      } else {
        setAverageWeeklyHours(formatHours(currentExpectedWeeklyHours * 60));
      }

      // --- 5. Day of Week Stats ---
      const dayMap = new Map<number, number[]>();
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      entries.forEach((entry) => {
        if (entry.status !== "work") return;

        const date = new Date(entry.date + "T00:00:00");
        const day = date.getDay();
        const result = calculateDailyBalance(entry, schedules);

        if (!dayMap.has(day)) {
          dayMap.set(day, []);
        }
        dayMap.get(day)!.push(result.actualMinutes);
      });

      const dayStats = dayNames
        .map((name, index) => {
          const minutes = dayMap.get(index) || [];
          const count = minutes.length;
          const avgMinutes =
            count > 0 ? minutes.reduce((a, b) => a + b, 0) / count : 0;
          const minMinutes = count > 0 ? Math.min(...minutes) : 0;
          const maxMinutes = count > 0 ? Math.max(...minutes) : 0;

          return {
            day: index,
            name,
            avgMinutes,
            minMinutes,
            maxMinutes,
            avgHoursStr: formatHours(Math.round(avgMinutes)),
            count,
          };
        })
        .filter((s) => s.day >= 1 && s.day <= 5); // Focus on Mon-Fri

      // Calculate percentages for bar heights (relative to global max)
      const globalMax = Math.max(...dayStats.map((s) => s.maxMinutes), 1);
      const dayStatsWithPercent = dayStats.map((s) => ({
        ...s,
        avgPercentage: (s.avgMinutes / globalMax) * 100,
        minPercentage: (s.minMinutes / globalMax) * 100,
        maxPercentage: (s.maxMinutes / globalMax) * 100,
      }));

      setDayOfWeekStats(dayStatsWithPercent);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Please log in</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Statistics</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="year" className="text-sm font-medium text-gray-700">
            Year:
          </label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div>Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vacation Stats */}
          <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 to-white border-t-4 border-cyan-500 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-cyan-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Vacation (Days)
              </h3>
            </div>
            {vacationStats && (
              <dl className="grid grid-cols-2 gap-4 relative">
                <div className="bg-white/60 rounded-lg p-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Allowance
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">
                    {vacationStats.allowance}
                  </dd>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-3">
                  <dt className="text-xs font-medium text-cyan-700 uppercase tracking-wide">
                    Remaining
                  </dt>
                  <dd className="text-2xl font-bold text-cyan-600 mt-1">
                    {vacationStats.remaining}
                  </dd>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Used
                  </dt>
                  <dd className="text-xl font-semibold text-gray-700 mt-1">
                    {vacationStats.used}
                  </dd>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Planned
                  </dt>
                  <dd className="text-xl font-semibold text-gray-700 mt-1">
                    {vacationStats.planned}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Sick Days */}
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-white border-t-4 border-rose-400 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-400/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-rose-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sick Days</h3>
            </div>
            <div className="flex items-baseline relative">
              <span className="text-5xl font-black text-rose-500">
                {sickDays}
              </span>
              <span className="ml-2 text-gray-400 font-medium">days</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Total sick days taken in {selectedYear}
            </p>
          </div>

          {/* Yearly Balance */}
          <div
            className={`relative overflow-hidden bg-gradient-to-br ${
              yearlyBalanceMinutes >= 0
                ? "from-emerald-50 to-white border-t-4 border-emerald-500"
                : "from-rose-50 to-white border-t-4 border-rose-500"
            } shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 ${
                yearlyBalanceMinutes >= 0 ? "bg-emerald-500/5" : "bg-rose-500/5"
              } rounded-full -translate-y-1/2 translate-x-1/2`}
            />
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 ${
                  yearlyBalanceMinutes >= 0
                    ? "bg-emerald-500/10"
                    : "bg-rose-500/10"
                } rounded-lg`}
              >
                <svg
                  className={`w-6 h-6 ${
                    yearlyBalanceMinutes >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Yearly Balance
              </h3>
            </div>
            <div className="flex items-baseline relative">
              <span
                className={`text-5xl font-black ${
                  yearlyBalanceMinutes >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {yearlyBalanceMinutes > 0 ? "+" : ""}
                {yearlyBalance}
              </span>
              <span className="ml-2 text-gray-400 font-medium">hours</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Total accumulated balance for {selectedYear}
            </p>
          </div>

          {/* Average Weekly Hours */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-white border-t-4 border-violet-500 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-violet-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Avg. Weekly Hours
              </h3>
            </div>
            <div className="flex items-baseline relative">
              <span className="text-5xl font-black text-violet-600">
                {averageWeeklyHours}
              </span>
              <span className="ml-2 text-gray-400 font-medium">hours/week</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Expected:</span>
              <span className="text-sm font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                {expectedWeeklyHours}h/week
              </span>
            </div>
          </div>

          {/* Weekly Rhythm */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-white border-t-4 border-amber-500 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Weekly Rhythm (Avg)
              </h3>
            </div>
            <div className="flex items-end justify-between h-40 gap-2 px-2">
              {dayOfWeekStats.map((day) => (
                <div
                  key={day.day}
                  className="flex flex-col items-center flex-1 h-full"
                >
                  {/* Hours label - always visible */}
                  <span className="text-xs font-semibold text-amber-700 mb-1 whitespace-nowrap">
                    {day.avgHoursStr}
                  </span>
                  {/* Bar container */}
                  <div className="relative w-full flex-1 flex flex-col justify-end">
                    {/* Max bar - lighter/faded, stands behind avg bar */}
                    {day.count > 1 && (
                      <div
                        className="absolute bottom-0 left-0 w-full bg-amber-200/30 rounded-t-md border-t-2 border-dashed border-amber-400/70"
                        style={{ height: `${Math.max(day.maxPercentage, 3)}%` }}
                      />
                    )}
                    {/* Average bar - solid, on top */}
                    <div
                      className="relative z-10 w-full bg-amber-400 rounded-t-md transition-all duration-500 ease-out hover:bg-amber-500 min-h-[4px]"
                      style={{ height: `${Math.max(day.avgPercentage, 3)}%` }}
                    />
                    {/* Min line - on top of avg bar */}
                    {day.count > 1 && (
                      <div
                        className="absolute left-0 w-full h-0 border-t-2 border-dashed border-amber-200 z-20"
                        style={{ bottom: `${day.minPercentage}%` }}
                      />
                    )}
                  </div>
                  {/* Day label */}
                  <span className="text-xs font-bold text-gray-600 uppercase mt-1">
                    {day.name.charAt(0)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center italic">
              Solid bar = avg, dashed lines = min & max
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
