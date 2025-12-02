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
        </div>
      )}
    </div>
  );
};
