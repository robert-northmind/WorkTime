import React, { useState, useEffect } from "react";
import { DailyEntryForm } from "../components/DailyEntryForm";
import {
  getEntries,
  saveEntry,
  deleteEntry,
} from "../services/firestore/FirestoreService";
import type { FirestoreDailyEntry } from "../types/firestore";
import { getCurrentUser } from "../services/auth/AuthService";
import { calculateDailyBalance, type DailyEntry } from "../services/balance/BalanceService";
import { getExpectedDailyHours } from "../services/schedule/ScheduleService";
import { formatHours } from "../services/time/TimeService";
import { trackUserAction } from "../services/faro/FaroService";

import { useSearchParams, useNavigate } from "react-router-dom";

export const AddEntryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateParam = searchParams.get("date");

  const [selectedDate, setSelectedDate] = useState(
    dateParam || new Date().toISOString().split("T")[0]
  );
  const [entry, setEntry] = useState<FirestoreDailyEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{
    actual: string;
    expected: string;
    diff: string;
    diffMinutes: number;
  } | null>(null);

  const user = getCurrentUser();

  const handleBack = () => {
    navigate("/timesheet");
  };

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(dateParam);
    }
  }, [dateParam]);

  useEffect(() => {
    if (!user) return;
    fetchEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user]);

  const fetchEntry = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const entries = await getEntries(user.uid, selectedDate, selectedDate);
      const currentEntry = entries[0] || null;
      setEntry(currentEntry);

      // Calculate balance preview
      // Note: We need the user's schedule settings here.
      // For now, we'll hardcode a default schedule or fetch it.
      // TODO: Fetch real settings.
      const defaultSchedule = [
        {
          effectiveDate: "2000-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      if (currentEntry) {
        const result = calculateDailyBalance(currentEntry, defaultSchedule);
        setBalance({
          actual: formatHours(result.actualMinutes),
          expected: formatHours(result.expectedMinutes),
          diff: formatHours(result.balanceMinutes),
          diffMinutes: result.balanceMinutes,
        });
      } else {
        // Preview for empty day
        const expected = getExpectedDailyHours(selectedDate, defaultSchedule);
        const diffMinutes = 0 - expected * 60;
        setBalance({
          actual: "0.00",
          expected: expected.toFixed(2),
          diff: formatHours(diffMinutes),
          diffMinutes: diffMinutes,
        });
      }
    } catch (error) {
      console.error("Error fetching entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = React.useCallback(
    (updatedFields: Partial<FirestoreDailyEntry>) => {
      // Need date to calculate balance
      if (!updatedFields.date) return;

      // Create a temporary entry object for calculation
      const tempEntry: DailyEntry = {
        date: updatedFields.date,
        startTime: updatedFields.startTime || "",
        endTime: updatedFields.endTime || "",
        lunchMinutes: updatedFields.lunchMinutes || 0,
        extraHours: updatedFields.extraHours || 0,
        status: updatedFields.status || "work",
        notes: updatedFields.notes,
        uid: user?.uid || "",
      };

      // Calculate balance preview
      const defaultSchedule = [
        {
          effectiveDate: "2000-01-01",
          weeklyHours: 40,
          workDays: [1, 2, 3, 4, 5],
        },
      ];

      const result = calculateDailyBalance(tempEntry, defaultSchedule);
      setBalance({
        actual: formatHours(result.actualMinutes),
        expected: formatHours(result.expectedMinutes),
        diff: formatHours(result.balanceMinutes),
        diffMinutes: result.balanceMinutes,
      });
    },
    [user]
  );

  const handleSave = async (newEntry: FirestoreDailyEntry) => {
    if (!user) return;

    // Track user action with Faro
    trackUserAction('entry-saved', {
      date: newEntry.date,
      hasStartTime: newEntry.startTime ? 'true' : 'false',
      hasEndTime: newEntry.endTime ? 'true' : 'false',
      hasLunch: newEntry.lunchMinutes ? 'true' : 'false',
    });

    await saveEntry(user.uid, newEntry);
    // Delay navigation to allow confetti animation to show
    setTimeout(() => {
      navigate("/timesheet");
    }, 800);
  };

  const handleDelete = async () => {
    if (!user || !entry) return;

    // Track user action with Faro
    trackUserAction('entry-deleted', {
      date: selectedDate,
    });

    await deleteEntry(user.uid, selectedDate);
    // Delay navigation to allow delete effect to show
    setTimeout(() => {
      navigate("/timesheet");
    }, 600);
  };

  if (!user) return <div>Please log in</div>;

  // Determine balance theme
  const balanceTheme = balance
    ? balance.diffMinutes > 0
      ? "emerald"
      : balance.diffMinutes < 0
      ? "rose"
      : "slate"
    : "slate";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Add Entry</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg
              className="w-5 h-5 text-indigo-600"
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
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 font-medium text-gray-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-gradient-to-br from-slate-50 to-white shadow-lg rounded-xl p-8 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          ) : (
            <DailyEntryForm
              date={selectedDate}
              initialData={entry}
              onSave={handleSave}
              onDelete={handleDelete}
              onChange={handleFormChange}
              uid={user.uid}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <div
            className={`relative overflow-hidden shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl ${
              balanceTheme === "emerald"
                ? "bg-gradient-to-br from-emerald-50 via-white to-white border-t-4 border-emerald-500"
                : balanceTheme === "rose"
                ? "bg-gradient-to-br from-rose-50 via-white to-white border-t-4 border-rose-500"
                : "bg-gradient-to-br from-slate-50 via-white to-white border-t-4 border-slate-400"
            }`}
          >
            {/* Decorative background element */}
            <div
              className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/4 ${
                balanceTheme === "emerald"
                  ? "bg-emerald-500/5"
                  : balanceTheme === "rose"
                  ? "bg-rose-500/5"
                  : "bg-slate-500/5"
              }`}
            />

            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`p-2 rounded-lg ${
                    balanceTheme === "emerald"
                      ? "bg-emerald-100"
                      : balanceTheme === "rose"
                      ? "bg-rose-100"
                      : "bg-slate-100"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${
                      balanceTheme === "emerald"
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Summary
                </h3>
              </div>

              {balance ? (
                <dl className="space-y-3">
                  <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                    <dt className="text-sm text-gray-500 font-medium">
                      Expected
                    </dt>
                    <dd className="text-lg font-bold text-gray-900">
                      {balance.expected}
                      <span className="text-sm font-normal text-gray-400 ml-1">
                        h
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                    <dt className="text-sm text-gray-500 font-medium">
                      Actual
                    </dt>
                    <dd className="text-lg font-bold text-gray-900">
                      {balance.actual}
                      <span className="text-sm font-normal text-gray-400 ml-1">
                        h
                      </span>
                    </dd>
                  </div>
                  <div
                    className={`flex justify-between items-center rounded-lg p-4 ${
                      balanceTheme === "emerald"
                        ? "bg-emerald-100"
                        : balanceTheme === "rose"
                        ? "bg-rose-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <dt
                      className={`text-sm font-semibold uppercase tracking-wide ${
                        balanceTheme === "emerald"
                          ? "text-emerald-700"
                          : balanceTheme === "rose"
                          ? "text-rose-700"
                          : "text-slate-600"
                      }`}
                    >
                      Balance
                    </dt>
                    <dd
                      className={`text-2xl font-black ${
                        balanceTheme === "emerald"
                          ? "text-emerald-600"
                          : balanceTheme === "rose"
                          ? "text-rose-600"
                          : "text-slate-500"
                      }`}
                    >
                      {balance.diffMinutes > 0 ? "+" : ""}
                      {balance.diff}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-center py-4">
                  <svg
                    className="mx-auto h-10 w-10 text-slate-300 mb-2"
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
                  <p className="text-gray-500 text-sm">
                    Select a date to view summary
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
