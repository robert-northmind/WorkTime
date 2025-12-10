import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth/AuthService";
import { getEntries, getUser } from "../services/firestore/FirestoreService";
import { calculateDailyBalance } from "../services/balance/BalanceService";
import { formatHours } from "../services/time/TimeService";
import { formatTimeDisplay } from "../services/time/TimeFormatService";
import {
  getWeekNumber,
  findScrollTargets,
  type WeekGroup,
} from "../services/scroll/ScrollService";
import type { FirestoreDailyEntry, CustomPTOType } from "../types/firestore";

const SCROLL_POSITION_KEY = "timesheet-scroll-position";

// Helper to get week date range
const getWeekRange = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => {
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  return `${formatDate(monday)} - ${formatDate(sunday)}`;
};

export const TimesheetPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<FirestoreDailyEntry[]>([]);
  const [schedules, setSchedules] = useState<any[]>([
    {
      effectiveDate: "2000-01-01",
      workDays: [1, 2, 3, 4, 5],
    },
  ]);
  const [customPTO, setCustomPTO] = useState<CustomPTOType[]>([]);
  const [ptoColors, setPtoColors] = useState<Record<string, string>>({});
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("24h");
  const [loading, setLoading] = useState(false);
  const hasRestoredScroll = useRef(false);

  const user = getCurrentUser();

  // Restore scroll position after data loads
  useEffect(() => {
    if (!loading && entries.length > 0 && !hasRestoredScroll.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        // Small delay to ensure DOM has rendered
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
        });
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
      }
      hasRestoredScroll.current = true;
    }
  }, [loading, entries]);

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
      if (userDoc && userDoc.settings) {
        if (
          userDoc.settings.schedules &&
          userDoc.settings.schedules.length > 0
        ) {
          setSchedules(userDoc.settings.schedules);
        }
        if (userDoc.settings.customPTO) {
          setCustomPTO(userDoc.settings.customPTO);
        }
        if (userDoc.settings.ptoColors) {
          setPtoColors(userDoc.settings.ptoColors);
        }
        if (userDoc.settings.timeFormat) {
          setTimeFormat(userDoc.settings.timeFormat);
        }
      }

      // Fetch Entries
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      const data = await getEntries(user.uid, startOfYear, endOfYear);
      // Sort descending by date
      setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (date: string) => {
    // Save scroll position before navigating
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    navigate(`/entry?date=${date}`);
  };

  // Generate year options (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Group entries by week and fill in missing days
  const groupedByWeek: {
    weekKey: string;
    weekRange: string;
    entries: { date: string; entry: FirestoreDailyEntry | null }[];
  }[] = [];
  let currentWeekKey = "";
  let currentWeekEntries: FirestoreDailyEntry[] = [];
  let currentWeekRange = "";

  entries.forEach((entry) => {
    const { year, week } = getWeekNumber(entry.date);
    const weekKey = `${year}-W${week}`;

    if (weekKey !== currentWeekKey) {
      if (currentWeekEntries.length > 0) {
        groupedByWeek.push({
          weekKey: currentWeekKey,
          weekRange: currentWeekRange,
          entries: fillWeekDays(currentWeekEntries, currentWeekKey),
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
      entries: fillWeekDays(currentWeekEntries, currentWeekKey),
    });
  }

  // Helper to fill in all weekdays (Mon-Fri) of a week
  function fillWeekDays(
    weekEntries: FirestoreDailyEntry[],
    weekKey: string
  ): { date: string; entry: FirestoreDailyEntry | null }[] {
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

    // Fill weekdays only (Mon-Fri = 5 days)
    const allDays: { date: string; entry: FirestoreDailyEntry | null }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build days in ascending order first (Mon to Fri)
    for (let i = 0; i < 5; i++) {
      // Only 5 weekdays
      // Create a new date in UTC for this day
      const currentDay = new Date(
        Date.UTC(
          monday.getUTCFullYear(),
          monday.getUTCMonth(),
          monday.getUTCDate() + i
        )
      );
      const dateStr = currentDay.toISOString().split("T")[0];

      // Only include days that are on or before today, or have an entry
      if (currentDay <= today || entryMap.has(dateStr)) {
        allDays.push({ date: dateStr, entry: entryMap.get(dateStr) || null });
      }
    }

    // Reverse to show most recent first (descending order)
    return allDays.reverse();
  }

  // Helper to check if a date string is today
  const isToday = (dateStr: string) => {
    const today = new Date();
    const date = new Date(dateStr + "T00:00:00");
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const scrollToToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Use the pure function to determine scroll targets
    const result = findScrollTargets(
      groupedByWeek as WeekGroup[],
      selectedYear,
      todayStr
    );

    // Handle year change action
    if (result.action === "changeYear") {
      setSelectedYear(result.targetYear);
      // User will need to click again after year switches
      return;
    }

    // Try each scroll target in order
    for (const target of result.targets) {
      if (target.type === "todayEntry") {
        const desktopEntry = document.getElementById("today-entry-desktop");
        const mobileEntry = document.getElementById("today-entry-mobile");

        if (desktopEntry && desktopEntry.offsetParent !== null) {
          desktopEntry.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (mobileEntry && mobileEntry.offsetParent !== null) {
          mobileEntry.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      } else if (target.type === "weekHeader") {
        const desktopHeader = document.getElementById(
          `week-header-desktop-${target.weekKey}`
        );
        const mobileHeader = document.getElementById(
          `week-header-mobile-${target.weekKey}`
        );

        if (desktopHeader && desktopHeader.offsetParent !== null) {
          desktopHeader.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (mobileHeader && mobileHeader.offsetParent !== null) {
          mobileHeader.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    }
  };

  if (!user) return <div>Please log in</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Timesheet</h2>
        <div className="flex items-center gap-3 self-end sm:self-auto">
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
          <button
            onClick={scrollToToday}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Today
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(
                SCROLL_POSITION_KEY,
                window.scrollY.toString()
              );
              navigate(`/entry?date=${new Date().toISOString().split("T")[0]}`);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block space-y-8">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-slate-50 to-white shadow-lg rounded-xl border border-slate-100">
                <svg
                  className="mx-auto h-12 w-12 text-slate-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-600">
                  No entries found for {selectedYear}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Start by adding your first time entry
                </p>
              </div>
            ) : (
              groupedByWeek.map((week) => {
                // Calculate weekly totals
                let weeklyBalanceMinutes = 0;
                let weeklyWorkedMinutes = 0;

                week.entries.forEach((item) => {
                  if (item.entry) {
                    const result = calculateDailyBalance(item.entry, schedules);
                    weeklyBalanceMinutes += result.balanceMinutes;
                    if (item.entry.status === "work") {
                      weeklyWorkedMinutes += result.actualMinutes;
                    }
                  }
                });

                const weeklyBalanceStr = formatHours(weeklyBalanceMinutes);
                const weeklyWorkedStr = formatHours(weeklyWorkedMinutes);
                const isWeekPositive = weeklyBalanceMinutes > 0;
                const isWeekZero = weeklyBalanceMinutes === 0;

                // Check if this week contains today
                const isCurrentWeek = week.entries.some((e) => isToday(e.date));

                // Determine color theme based on balance
                const balanceTheme = isWeekPositive
                  ? "emerald"
                  : isWeekZero
                  ? "slate"
                  : "rose";

                return (
                  <div
                    key={week.weekKey}
                    className={`relative overflow-hidden shadow-lg sm:rounded-xl transition-all duration-300 hover:shadow-xl ${
                      isCurrentWeek ? "ring-2 ring-amber-400 ring-offset-2" : ""
                    } ${
                      balanceTheme === "emerald"
                        ? "bg-gradient-to-br from-emerald-50/80 via-white to-white border-t-4 border-emerald-500"
                        : balanceTheme === "rose"
                        ? "bg-gradient-to-br from-rose-50/80 via-white to-white border-t-4 border-rose-500"
                        : "bg-gradient-to-br from-slate-50/80 via-white to-white border-t-4 border-slate-400"
                    }`}
                  >
                    {/* Decorative background element */}
                    <div
                      className={`absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-1/2 translate-x-1/4 ${
                        balanceTheme === "emerald"
                          ? "bg-emerald-500/5"
                          : balanceTheme === "rose"
                          ? "bg-rose-500/5"
                          : "bg-slate-500/5"
                      }`}
                    />

                    {/* Week Header */}
                    <div
                      id={`week-header-desktop-${week.weekKey}`}
                      className={`relative px-6 py-4 border-b flex items-center justify-between ${
                        isCurrentWeek
                          ? "bg-amber-50/80 border-amber-300"
                          : balanceTheme === "emerald"
                          ? "bg-emerald-50/50 border-emerald-300"
                          : balanceTheme === "rose"
                          ? "bg-rose-50/50 border-rose-300"
                          : "bg-slate-50/50 border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isCurrentWeek
                              ? "bg-amber-100"
                              : balanceTheme === "emerald"
                              ? "bg-emerald-100"
                              : balanceTheme === "rose"
                              ? "bg-rose-100"
                              : "bg-slate-100"
                          }`}
                        >
                          <svg
                            className={`w-5 h-5 ${
                              isCurrentWeek
                                ? "text-amber-600"
                                : balanceTheme === "emerald"
                                ? "text-emerald-600"
                                : balanceTheme === "rose"
                                ? "text-rose-600"
                                : "text-slate-600"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3
                            className={`text-lg font-bold ${
                              isCurrentWeek ? "text-amber-900" : "text-gray-900"
                            }`}
                          >
                            Week {week.weekKey.split("-W")[1]}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {week.weekRange}
                          </span>
                        </div>
                        {isCurrentWeek && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800 shadow-sm">
                            Current Week
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Worked
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {weeklyWorkedStr}
                          </div>
                        </div>
                        <div
                          className={`text-right px-4 py-1 rounded-lg ${
                            balanceTheme === "emerald"
                              ? "bg-emerald-100"
                              : balanceTheme === "rose"
                              ? "bg-rose-100"
                              : "bg-slate-100"
                          }`}
                        >
                          <div
                            className={`text-xs uppercase tracking-wide ${
                              balanceTheme === "emerald"
                                ? "text-emerald-600"
                                : balanceTheme === "rose"
                                ? "text-rose-600"
                                : "text-slate-500"
                            }`}
                          >
                            Balance
                          </div>
                          <div
                            className={`text-lg font-black ${
                              balanceTheme === "emerald"
                                ? "text-emerald-600"
                                : balanceTheme === "rose"
                                ? "text-rose-600"
                                : "text-slate-500"
                            }`}
                          >
                            {isWeekPositive ? "+" : ""}
                            {weeklyBalanceStr}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Week Entries Table */}
                    <table className="relative min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32"
                          >
                            Hours
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24"
                          >
                            Balance
                          </th>
                          <th
                            scope="col"
                            className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20"
                          >
                            Lunch
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24"
                          >
                            Extra
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {week.entries.map((item) => {
                          const isTodayEntry = isToday(item.date);

                          if (!item.entry) {
                            // Missing entry - show placeholder
                            return (
                              <tr
                                key={item.date}
                                id={
                                  isTodayEntry
                                    ? "today-entry-desktop"
                                    : undefined
                                }
                                onClick={() => handleRowClick(item.date)}
                                className={`cursor-pointer transition-all duration-200 ${
                                  isTodayEntry
                                    ? "bg-amber-50 shadow-[inset_0_2px_0_#fcd34d,inset_0_-2px_0_#fcd34d] z-10 relative"
                                    : "hover:bg-gray-50/80 bg-gray-50/30"
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">
                                  {new Date(
                                    item.date + "T00:00:00"
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}{" "}
                                  <span className="italic">{item.date}</span>
                                  {isTodayEntry && (
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                      Today
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                                  Not entered
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  -
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  -
                                </td>
                                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  -
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  -
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  -
                                </td>
                              </tr>
                            );
                          }

                          // Regular entry with data
                          const entry = item.entry;
                          const balanceResult = calculateDailyBalance(
                            entry,
                            schedules
                          );
                          const balanceStr = formatHours(
                            balanceResult.balanceMinutes
                          );
                          const isPositive = balanceResult.balanceMinutes > 0;
                          const isZero = balanceResult.balanceMinutes === 0;

                          return (
                            <tr
                              key={entry.date}
                              id={
                                isTodayEntry ? "today-entry-desktop" : undefined
                              }
                              onClick={() => handleRowClick(entry.date)}
                              className={`cursor-pointer transition-all duration-200 ${
                                isTodayEntry
                                  ? "bg-amber-50 shadow-[inset_0_2px_0_#fcd34d,inset_0_-2px_0_#fcd34d] z-10 relative"
                                  : entry.status !== "work"
                                  ? "bg-sky-50/50 hover:bg-sky-50"
                                  : "hover:bg-gray-50/80"
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {new Date(
                                  item.date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                })}{" "}
                                <span className="italic">{entry.date}</span>
                                {isTodayEntry && (
                                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                    Today
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(() => {
                                    // Check if it's a custom type or has a custom color override
                                    const custom = customPTO.find(
                                      (p) => p.id === entry.status
                                    );
                                    if (custom || ptoColors[entry.status])
                                      return "text-white"; // Default to white text for custom/overrides

                                    // Default fixed styles
                                    if (entry.status === "work")
                                      return "bg-green-100 text-green-800";
                                    if (entry.status === "vacation")
                                      return "bg-blue-100 text-blue-800";
                                    if (entry.status === "sick")
                                      return "bg-red-100 text-red-800";
                                    if (entry.status === "holiday")
                                      return "bg-yellow-100 text-yellow-800";
                                    if (entry.status === "grafana-day")
                                      return "bg-gradient-to-r from-orange-400 to-yellow-400 text-white";
                                    return "bg-gray-100 text-gray-800";
                                  })()}`}
                                  style={(() => {
                                    const custom = customPTO.find(
                                      (p) => p.id === entry.status
                                    );
                                    if (custom)
                                      return { backgroundColor: custom.color };
                                    if (ptoColors[entry.status])
                                      return {
                                        backgroundColor:
                                          ptoColors[entry.status],
                                      };
                                    return {};
                                  })()}
                                >
                                  {(() => {
                                    if (entry.status === "grafana-day")
                                      return "Grafana Day";
                                    const custom = customPTO.find(
                                      (p) => p.id === entry.status
                                    );
                                    return custom ? custom.name : entry.status;
                                  })()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.status === "work"
                                  ? `${formatTimeDisplay(
                                      entry.startTime,
                                      timeFormat
                                    )} - ${formatTimeDisplay(
                                      entry.endTime,
                                      timeFormat
                                    )}`
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {entry.status === "work" ? (
                                  <span
                                    className={`${
                                      isPositive
                                        ? "text-green-600"
                                        : isZero
                                        ? "text-gray-400"
                                        : "text-red-600"
                                    } font-medium`}
                                  >
                                    {isPositive ? "+" : ""}
                                    {balanceStr}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.status === "work" &&
                                entry.lunchMinutes > 0
                                  ? formatHours(entry.lunchMinutes)
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.extraHours
                                  ? `+${entry.extraHours}h`
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                                {entry.notes || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-4">
            {entries.length === 0 ? (
              <div className="px-4 py-8 text-center bg-gradient-to-br from-slate-50 to-white shadow-lg rounded-xl border border-slate-100">
                <svg
                  className="mx-auto h-10 w-10 text-slate-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-base font-medium text-gray-600">
                  No entries found for {selectedYear}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Start by adding your first time entry
                </p>
              </div>
            ) : (
              groupedByWeek.map((week) => {
                // Calculate weekly totals
                let weeklyBalanceMinutes = 0;
                let weeklyWorkedMinutes = 0;

                week.entries.forEach((item) => {
                  if (item.entry) {
                    const result = calculateDailyBalance(item.entry, schedules);
                    weeklyBalanceMinutes += result.balanceMinutes;
                    if (item.entry.status === "work") {
                      weeklyWorkedMinutes += result.actualMinutes;
                    }
                  }
                });

                const weeklyBalanceStr = formatHours(weeklyBalanceMinutes);
                const weeklyWorkedStr = formatHours(weeklyWorkedMinutes);
                const isWeekPositive = weeklyBalanceMinutes > 0;
                const isWeekZero = weeklyBalanceMinutes === 0;
                const isCurrentWeek = week.entries.some((e) => isToday(e.date));

                // Determine color theme based on balance (mobile)
                const mobileBalanceTheme = isWeekPositive
                  ? "emerald"
                  : isWeekZero
                  ? "slate"
                  : "rose";

                return (
                  <div
                    key={week.weekKey}
                    className={`relative overflow-hidden shadow-lg rounded-xl transition-all duration-300 ${
                      isCurrentWeek ? "ring-2 ring-amber-400 ring-offset-2" : ""
                    } ${
                      mobileBalanceTheme === "emerald"
                        ? "bg-gradient-to-br from-emerald-50/80 via-white to-white border-t-4 border-emerald-500"
                        : mobileBalanceTheme === "rose"
                        ? "bg-gradient-to-br from-rose-50/80 via-white to-white border-t-4 border-rose-500"
                        : "bg-gradient-to-br from-slate-50/80 via-white to-white border-t-4 border-slate-400"
                    }`}
                  >
                    {/* Decorative background element */}
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/4 ${
                        mobileBalanceTheme === "emerald"
                          ? "bg-emerald-500/5"
                          : mobileBalanceTheme === "rose"
                          ? "bg-rose-500/5"
                          : "bg-slate-500/5"
                      }`}
                    />

                    {/* Weekly Header */}
                    <div
                      id={`week-header-mobile-${week.weekKey}`}
                      className={`relative px-4 py-3 border-b ${
                        isCurrentWeek
                          ? "bg-amber-50/80 border-amber-300"
                          : mobileBalanceTheme === "emerald"
                          ? "bg-emerald-50/50 border-emerald-300"
                          : mobileBalanceTheme === "rose"
                          ? "bg-rose-50/50 border-rose-300"
                          : "bg-slate-50/50 border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isCurrentWeek
                                ? "bg-amber-100"
                                : mobileBalanceTheme === "emerald"
                                ? "bg-emerald-100"
                                : mobileBalanceTheme === "rose"
                                ? "bg-rose-100"
                                : "bg-slate-100"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 ${
                                isCurrentWeek
                                  ? "text-amber-600"
                                  : mobileBalanceTheme === "emerald"
                                  ? "text-emerald-600"
                                  : mobileBalanceTheme === "rose"
                                  ? "text-rose-600"
                                  : "text-slate-600"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <span
                            className={`text-base font-bold ${
                              isCurrentWeek ? "text-amber-900" : "text-gray-900"
                            }`}
                          >
                            Week {week.weekKey.split("-W")[1]}
                          </span>
                          {isCurrentWeek && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {week.weekRange}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">
                          Worked:{" "}
                          <span className="font-bold text-gray-900">
                            {weeklyWorkedStr}
                          </span>
                        </span>
                        <span
                          className={`text-sm font-black px-2 py-0.5 rounded-md ${
                            mobileBalanceTheme === "emerald"
                              ? "bg-emerald-100 text-emerald-600"
                              : mobileBalanceTheme === "rose"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isWeekPositive ? "+" : ""}
                          {weeklyBalanceStr}
                        </span>
                      </div>
                    </div>

                    {/* Daily Cards */}
                    <div className="relative divide-y divide-gray-300">
                      {week.entries.map((item) => {
                        const isTodayEntry = isToday(item.date);

                        if (!item.entry) {
                          return (
                            <div
                              key={item.date}
                              id={
                                isTodayEntry ? "today-entry-mobile" : undefined
                              }
                              onClick={() => handleRowClick(item.date)}
                              className={`w-full px-4 py-3 active:bg-gray-100 transition-colors ${
                                isTodayEntry
                                  ? "bg-amber-50 shadow-[inset_0_2px_0_#fcd34d,inset_0_-2px_0_#fcd34d] z-10 relative"
                                  : "bg-gray-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-400">
                                    {new Date(
                                      item.date + "T00:00:00"
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                    })}
                                    {isTodayEntry && (
                                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                        Today
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-400 italic">
                                    {item.date}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-400 italic">
                                  Not entered
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const entry = item.entry;
                        const balanceResult = calculateDailyBalance(
                          entry,
                          schedules
                        );
                        const balanceStr = formatHours(
                          balanceResult.balanceMinutes
                        );
                        const isPositive = balanceResult.balanceMinutes > 0;
                        const isZero = balanceResult.balanceMinutes === 0;

                        return (
                          <div
                            key={entry.date}
                            id={isTodayEntry ? "today-entry-mobile" : undefined}
                            onClick={() => handleRowClick(entry.date)}
                            className={`w-full px-4 py-3 active:bg-gray-50 transition-colors ${
                              isTodayEntry
                                ? "bg-amber-50 shadow-[inset_0_2px_0_#fcd34d,inset_0_-2px_0_#fcd34d] z-10 relative"
                                : entry.status !== "work"
                                ? "bg-sky-50/30"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {new Date(
                                    entry.date + "T00:00:00"
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}
                                  {isTodayEntry && (
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                      Today
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {entry.date}
                                </span>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`text-sm font-bold ${
                                    isPositive
                                      ? "text-emerald-600"
                                      : isZero
                                      ? "text-gray-400"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {isPositive ? "+" : ""}
                                  {balanceStr}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {entry.status === "work"
                                    ? "Work"
                                    : entry.status === "vacation"
                                    ? "Vacation"
                                    : entry.status === "holiday"
                                    ? "Holiday"
                                    : entry.status === "sick"
                                    ? "Sick"
                                    : entry.status === "grafana-day"
                                    ? "Grafana Day"
                                    : entry.status}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                              {entry.status === "work" && (
                                <>
                                  <span>
                                    {formatTimeDisplay(
                                      entry.startTime,
                                      timeFormat
                                    )}{" "}
                                    -{" "}
                                    {formatTimeDisplay(
                                      entry.endTime,
                                      timeFormat
                                    )}
                                  </span>
                                  {entry.lunchMinutes > 0 && (
                                    <span>
                                      Lunch: {formatHours(entry.lunchMinutes)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {(entry.extraHours > 0 || entry.notes) && (
                              <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2 text-xs text-gray-500">
                                {entry.extraHours > 0 && (
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                                    Extra: +{entry.extraHours}h
                                  </span>
                                )}
                                {entry.notes && (
                                  <span className="truncate max-w-full">
                                    {entry.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
