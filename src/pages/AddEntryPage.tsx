import React, { useState, useEffect } from 'react';
import { DailyEntryForm } from '../components/DailyEntryForm';
import { getEntries, saveEntry } from '../services/firestore/FirestoreService';
import type { FirestoreDailyEntry } from '../types/firestore';
import { getCurrentUser } from '../services/auth/AuthService';
import { calculateDailyBalance } from '../services/balance/BalanceService';
import { getExpectedDailyHours } from '../services/schedule/ScheduleService';
import { formatHours } from '../services/time/TimeService';

import { useSearchParams } from 'react-router-dom';

export const AddEntryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [selectedDate, setSelectedDate] = useState(dateParam || new Date().toISOString().split('T')[0]);
  const [entry, setEntry] = useState<FirestoreDailyEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{ actual: string; expected: string; diff: string } | null>(null);

  const user = getCurrentUser();

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(dateParam);
    }
  }, [dateParam]);

  useEffect(() => {
    if (!user) return;
    fetchEntry();
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
      const defaultSchedule = [{
        effectiveDate: '2000-01-01',
        weeklyHours: 40,
        workDays: [1, 2, 3, 4, 5]
      }];

      if (currentEntry) {
        const result = calculateDailyBalance(currentEntry, defaultSchedule);
        setBalance({
          actual: formatHours(result.actualMinutes),
          expected: formatHours(result.expectedMinutes),
          diff: formatHours(result.balanceMinutes)
        });
      } else {
        // Preview for empty day
        const expected = getExpectedDailyHours(selectedDate, defaultSchedule);
        setBalance({
          actual: '0.00',
          expected: expected.toFixed(2),
          diff: formatHours(0 - expected * 60)
        });
      }

    } catch (error) {
      console.error('Error fetching entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newEntry: FirestoreDailyEntry) => {
    if (!user) return;
    await saveEntry(user.uid, newEntry);
    await fetchEntry(); // Refresh
  };

  if (!user) return <div>Please log in</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Timesheet</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <DailyEntryForm
              date={selectedDate}
              initialData={entry}
              onSave={handleSave}
              uid={user.uid}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Summary</h3>
            {balance ? (
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Expected</dt>
                  <dd className="text-sm font-medium text-gray-900">{balance.expected} h</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Actual</dt>
                  <dd className="text-sm font-medium text-gray-900">{balance.actual} h</dd>
                </div>
                <div className="pt-4 border-t border-gray-200 flex justify-between">
                  <dt className="text-base font-medium text-gray-900">Balance</dt>
                  <dd className={`text-base font-medium ${Number(balance.diff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(balance.diff) > 0 ? '+' : ''}{balance.diff} h
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">Select a date to view summary</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
