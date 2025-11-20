import React, { useState, useEffect } from 'react';
import type { DailyEntry } from '../services/balance/BalanceService';
import type { FirestoreDailyEntry } from '../types/firestore';

interface DailyEntryFormProps {
  date: string;
  initialData?: FirestoreDailyEntry | null;
  onSave: (entry: FirestoreDailyEntry) => Promise<void>;
  uid: string;
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ date, initialData, onSave, uid }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [extraHours, setExtraHours] = useState(0);
  const [status, setStatus] = useState<DailyEntry['status']>('work');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setStartTime(initialData.startTime || '');
      setEndTime(initialData.endTime || '');
      setLunchMinutes(initialData.lunchMinutes || 0);
      setExtraHours(initialData.extraHours || 0);
      setStatus(initialData.status || 'work');
      setNotes(initialData.notes || '');
    } else {
      // Reset form for new date
      setStartTime('');
      setEndTime('');
      setLunchMinutes(0);
      setExtraHours(0);
      setStatus('work');
      setNotes('');
    }
  }, [initialData, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const entry: FirestoreDailyEntry = {
      uid,
      date,
      startTime,
      endTime,
      lunchMinutes: Number(lunchMinutes),
      extraHours: Number(extraHours),
      status,
      notes,
      updatedAt: new Date().toISOString()
    };

    try {
      await onSave(entry);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Entry for {date}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DailyEntry['status'])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          >
            <option value="work">Work</option>
            <option value="vacation">Vacation</option>
            <option value="holiday">Holiday</option>
            <option value="sick">Sick</option>
          </select>
        </div>

        {status === 'work' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lunch (minutes)</label>
              <input
                type="number"
                value={lunchMinutes}
                onChange={(e) => setLunchMinutes(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Extra Hours</label>
              <input
                type="number"
                step="0.01"
                value={extraHours}
                onChange={(e) => setExtraHours(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
};
