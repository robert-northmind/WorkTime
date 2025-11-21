
import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../services/auth/AuthService';
import { getEntries, getUser } from '../services/firestore/FirestoreService';
import { calculateVacationStats, type VacationSettings } from '../services/vacation/VacationService';
import { calculateDailyBalance } from '../services/balance/BalanceService';
import { formatHours } from '../services/time/TimeService';


export const StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [vacationStats, setVacationStats] = useState<{ used: number; planned: number; remaining: number; allowance: number } | null>(null);
  const [yearlyBalance, setYearlyBalance] = useState<string>('0.00');
  const [averageWeeklyHours, setAverageWeeklyHours] = useState<string>('0.00');
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
        allowanceDays: 25
      };
      
      let weeklyHours = 40;

      if (userDoc && userDoc.settings) {
        if (userDoc.settings.vacation) {
          vacationSettings = userDoc.settings.vacation;
        }
        if (userDoc.settings.schedules && userDoc.settings.schedules.length > 0) {
          weeklyHours = userDoc.settings.schedules[0].weeklyHours;
          setExpectedWeeklyHours(weeklyHours);
        }
      }

      // --- 2. Vacation Stats ---
      // Use a dynamic reference date:
      // If selected year is in the past, use Dec 31st of that year (so all days count as used).
      // If selected year is current, use today.
      // If selected year is future, use Jan 1st of that year (so all days count as planned).
      let referenceDate = new Date().toISOString().split('T')[0];
      if (selectedYear < currentYear) {
        referenceDate = `${selectedYear}-12-31`;
      } else if (selectedYear > currentYear) {
        referenceDate = `${selectedYear}-01-01`;
      }

      const vStats = calculateVacationStats(entries, vacationSettings, referenceDate);
      setVacationStats({
        used: vStats.usedDays,
        planned: vStats.plannedDays,
        remaining: vStats.remainingDays,
        allowance: vStats.allowanceDays
      });

      // --- 3. Yearly Balance & Average Weekly Hours ---
      const defaultSchedule = [{
        effectiveDate: '2000-01-01',
        weeklyHours: weeklyHours,
        workDays: [1, 2, 3, 4, 5]
      }];

      let totalBalanceMinutes = 0;
      
      // Map entries for faster lookup
      const entriesMap = new Map(entries.map(e => [e.date, e]));
      
      // Iterate through every day of the selected year to calculate yearly balance
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31);
      const calculationEndDate = selectedYear === currentYear ? new Date() : endDate;

      for (let d = new Date(startDate); d <= calculationEndDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const entry = entriesMap.get(dateStr);
        
        if (!entry) {
          continue;
        }

        const result = calculateDailyBalance(entry, defaultSchedule);
        totalBalanceMinutes += result.balanceMinutes;
      }

      setYearlyBalance(formatHours(totalBalanceMinutes));

      // --- 4. Average Weekly Hours ---
      // Group entries by week and calculate weekly balances
      const weeklyBalances = new Map<string, number>();
      
      // Helper to get ISO week number
      const getWeekKey = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${weekNo}`;
      };
      
      // Calculate balance for each week
      entries.forEach(entry => {
        const weekKey = getWeekKey(entry.date);
        const result = calculateDailyBalance(entry, defaultSchedule);
        
        if (!weeklyBalances.has(weekKey)) {
          weeklyBalances.set(weekKey, 0);
        }
        weeklyBalances.set(weekKey, weeklyBalances.get(weekKey)! + result.balanceMinutes);
      });
      
      // Calculate average weekly balance
      const weekCount = weeklyBalances.size;
      if (weekCount > 0) {
        const totalWeeklyBalance = Array.from(weeklyBalances.values()).reduce((sum, balance) => sum + balance, 0);
        const avgWeeklyBalanceMinutes = totalWeeklyBalance / weekCount;
        
        // Average weekly hours = expected hours + average weekly balance
        const expectedWeeklyMinutes = weeklyHours * 60;
        const avgWeeklyMinutes = expectedWeeklyMinutes + avgWeeklyBalanceMinutes;
        
        setAverageWeeklyHours(formatHours(avgWeeklyMinutes));
      } else {
        setAverageWeeklyHours(formatHours(weeklyHours * 60));
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
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
          <label htmlFor="year" className="text-sm font-medium text-gray-700">Year:</label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div>Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vacation Stats */}
          <div className="bg-white shadow rounded-lg p-6 md:col-span-3 lg:col-span-1">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vacation (Days)</h3>
            {vacationStats && (
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Allowance</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{vacationStats.allowance}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Remaining</dt>
                  <dd className="text-2xl font-semibold text-blue-600">{vacationStats.remaining}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Used</dt>
                  <dd className="text-lg font-medium text-gray-900">{vacationStats.used}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Planned</dt>
                  <dd className="text-lg font-medium text-gray-900">{vacationStats.planned}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Yearly Balance */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Yearly Balance</h3>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${Number(yearlyBalance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(yearlyBalance) > 0 ? '+' : ''}{yearlyBalance}
              </span>
              <span className="ml-2 text-gray-500">hours</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Total accumulated balance for {selectedYear} (up to today).
            </p>
          </div>

          {/* Average Weekly Hours */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Avg. Weekly Hours</h3>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                {averageWeeklyHours}
              </span>
              <span className="ml-2 text-gray-500">hours/week</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Expected: {expectedWeeklyHours}h/week
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
