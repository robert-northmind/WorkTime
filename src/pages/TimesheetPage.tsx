import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth/AuthService';
import { getEntries, getUser } from '../services/firestore/FirestoreService';
import { calculateDailyBalance } from '../services/balance/BalanceService';
import { formatHours } from '../services/time/TimeService';
import type { FirestoreDailyEntry } from '../types/firestore';

// Helper to get ISO week number
const getWeekNumber = (dateStr: string): { year: number; week: number } => {
  const date = new Date(dateStr + 'T00:00:00');
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
};

// Helper to get week date range
const getWeekRange = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => {
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  };
  
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
};

export const TimesheetPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<FirestoreDailyEntry[]>([]);
  const [schedules, setSchedules] = useState<any[]>([{
    effectiveDate: '2000-01-01',
    weeklyHours: 40,
    workDays: [1, 2, 3, 4, 5]
  }]);
  const [loading, setLoading] = useState(false);
  
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, selectedYear]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch Settings
      const userDoc = await getUser(user.uid);
      if (userDoc && userDoc.settings && userDoc.settings.schedules && userDoc.settings.schedules.length > 0) {
        setSchedules(userDoc.settings.schedules);
      }

      // Fetch Entries
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      const data = await getEntries(user.uid, startOfYear, endOfYear);
      // Sort descending by date
      setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (date: string) => {
    navigate(`/entry?date=${date}`);
  };

  // Generate year options (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Group entries by week and fill in missing days
  const groupedByWeek: { weekKey: string; weekRange: string; entries: { date: string; entry: FirestoreDailyEntry | null }[] }[] = [];
  let currentWeekKey = '';
  let currentWeekEntries: FirestoreDailyEntry[] = [];
  let currentWeekRange = '';

  entries.forEach((entry) => {
    const { year, week } = getWeekNumber(entry.date);
    const weekKey = `${year}-W${week}`;
    
    if (weekKey !== currentWeekKey) {
      if (currentWeekEntries.length > 0) {
        groupedByWeek.push({ 
          weekKey: currentWeekKey, 
          weekRange: currentWeekRange, 
          entries: fillWeekDays(currentWeekEntries, currentWeekKey) 
        });
      }
      currentWeekKey = weekKey;
      currentWeekRange = getWeekRange(entry.date);
      currentWeekEntries = [entry];
    } else {
      currentWeekEntries.push(entry);
    }
  });

  if (currentWeekEntries.length > 0) {
    groupedByWeek.push({ 
      weekKey: currentWeekKey, 
      weekRange: currentWeekRange, 
      entries: fillWeekDays(currentWeekEntries, currentWeekKey) 
    });
  }

  // Helper to fill in all weekdays (Mon-Fri) of a week
  function fillWeekDays(weekEntries: FirestoreDailyEntry[], weekKey: string): { date: string; entry: FirestoreDailyEntry | null }[] {
    if (weekEntries.length === 0) return [];
    
    // Parse week key to get year and week number (e.g., "2025-W47")
    const [yearStr, weekStr] = weekKey.split('-W');
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
    weekEntries.forEach(entry => entryMap.set(entry.date, entry));
    
    // Fill weekdays only (Mon-Fri = 5 days)
    const allDays: { date: string; entry: FirestoreDailyEntry | null }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Build days in ascending order first (Mon to Fri)
    for (let i = 0; i < 5; i++) { // Only 5 weekdays
      // Create a new date in UTC for this day
      const currentDay = new Date(Date.UTC(
        monday.getUTCFullYear(),
        monday.getUTCMonth(),
        monday.getUTCDate() + i
      ));
      const dateStr = currentDay.toISOString().split('T')[0];
      
      // Only include days that are on or before today, or have an entry
      if (currentDay <= today || entryMap.has(dateStr)) {
        allDays.push({ date: dateStr, entry: entryMap.get(dateStr) || null });
      }
    }
    
    // Reverse to show most recent first (descending order)
    return allDays.reverse();
  }

  if (!user) return <div>Please log in</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Timesheet</h2>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => navigate(`/entry?date=${new Date().toISOString().split('T')[0]}`)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No entries found for {selectedYear}
                  </td>
                </tr>
              ) : (
                groupedByWeek.map((week) => {
                  // Calculate weekly totals
                  let weeklyBalanceMinutes = 0;
                  let weeklyWorkedMinutes = 0;
                  
                  week.entries.forEach((item) => {
                    if (item.entry) {
                      const result = calculateDailyBalance(item.entry, schedules);
                      weeklyBalanceMinutes += result.balanceMinutes;
                      if (item.entry.status === 'work') {
                        weeklyWorkedMinutes += result.actualMinutes;
                      }
                    }
                  });

                  const weeklyBalanceStr = formatHours(weeklyBalanceMinutes);
                  const weeklyWorkedStr = formatHours(weeklyWorkedMinutes);
                  const isWeekPositive = weeklyBalanceMinutes > 0;
                  const isWeekZero = weeklyBalanceMinutes === 0;

                  return (
                    <React.Fragment key={week.weekKey}>
                      {/* Weekly Summary Row */}
                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">
                              Week {week.weekKey.split('-W')[1]} ({week.weekRange})
                            </span>
                            <div className="flex gap-6 text-sm">
                              <span className="text-slate-700">
                                <span className="font-medium">Worked:</span> {weeklyWorkedStr}
                              </span>
                              <span className={`font-medium ${isWeekPositive ? 'text-green-700' : isWeekZero ? 'text-gray-500' : 'text-red-700'}`}>
                                <span className="font-medium">Balance:</span> {isWeekPositive ? '+' : ''}{weeklyBalanceStr}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Individual Entry Rows */}
                      {week.entries.map((item) => {
                        if (!item.entry) {
                          // Missing entry - show placeholder
                          return (
                            <tr 
                              key={item.date}
                              onClick={() => handleRowClick(item.date)}
                              className="hover:bg-gray-50 cursor-pointer transition-colors bg-gray-50/50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">
                                {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                                <span className="italic">{item.date}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                                Not entered
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                            </tr>
                          );
                        }
                        
                        // Regular entry with data
                        const entry = item.entry;
                        const balanceResult = calculateDailyBalance(entry, schedules);
                        const balanceStr = formatHours(balanceResult.balanceMinutes);
                        const isPositive = balanceResult.balanceMinutes > 0;
                        const isZero = balanceResult.balanceMinutes === 0;
                        
                        return (
                          <tr 
                            key={entry.date} 
                            onClick={() => handleRowClick(entry.date)}
                            className={`cursor-pointer transition-colors ${
                              entry.status !== 'work' 
                                ? 'bg-blue-50 hover:bg-blue-100' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                              <span className="italic">{entry.date}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${entry.status === 'work' ? 'bg-green-100 text-green-800' : 
                                  entry.status === 'vacation' ? 'bg-blue-100 text-blue-800' :
                                  entry.status === 'sick' ? 'bg-red-100 text-red-800' :
                                  entry.status === 'grafana-day' ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white' :
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {entry.status === 'grafana-day' ? 'Grafana Day' : entry.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.status === 'work' ? `${entry.startTime} - ${entry.endTime}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {entry.status === 'work' ? (
                                <span className={`${isPositive ? 'text-green-600' : isZero ? 'text-gray-400' : 'text-red-600'} font-medium`}>
                                  {isPositive ? '+' : ''}{balanceStr}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.extraHours ? `+${entry.extraHours}h` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                              {entry.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
