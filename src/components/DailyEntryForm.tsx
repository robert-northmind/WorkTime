import React, { useState, useEffect, useRef } from 'react';
import type { DailyEntry } from '../services/balance/BalanceService';
import type { FirestoreDailyEntry } from '../types/firestore';
import { SuccessConfetti } from './SuccessConfetti';
import { DeleteEffect } from './DeleteEffect';
import { minutesToTime, timeToMinutes } from '../services/time/TimeService';

interface DailyEntryFormProps {
  date: string;
  initialData?: FirestoreDailyEntry | null;
  onSave: (entry: FirestoreDailyEntry) => Promise<void>;
  onDelete?: () => void;
  onChange?: (entry: Partial<FirestoreDailyEntry>) => void;
  uid: string;
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ date, initialData, onSave, onDelete, onChange, uid }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lunchTime, setLunchTime] = useState('00:00');
  const [extraTime, setExtraTime] = useState('00:00');
  const [status, setStatus] = useState<DailyEntry['status']>('work');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDeleteEffect, setShowDeleteEffect] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange({
        date,
        startTime,
        endTime,
        lunchMinutes: timeToMinutes(lunchTime),
        extraHours: timeToMinutes(extraTime) / 60,
        status,
        notes
      });
    }
  }, [date, startTime, endTime, lunchTime, extraTime, status, notes, onChange]);

  useEffect(() => {
    if (initialData) {
      setStartTime(initialData.startTime || '');
      setEndTime(initialData.endTime || '');
      setLunchTime(minutesToTime(initialData.lunchMinutes || 0));
      setExtraTime(minutesToTime((initialData.extraHours || 0) * 60));
      setStatus(initialData.status || 'work');
      setNotes(initialData.notes || '');
    } else {
      // Reset form for new date
      setStartTime('');
      setEndTime('');
      setLunchTime('00:00');
      setExtraTime('00:00');
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
      lunchMinutes: timeToMinutes(lunchTime),
      extraHours: timeToMinutes(extraTime) / 60,
      status,
      notes,
      updatedAt: new Date().toISOString()
    };

    try {
      setShowConfetti(true);
      await onSave(entry);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
      setShowConfetti(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SuccessConfetti trigger={showConfetti} buttonRef={saveButtonRef} onComplete={() => setShowConfetti(false)} />
      <DeleteEffect trigger={showDeleteEffect} buttonRef={deleteButtonRef} onComplete={() => setShowDeleteEffect(false)} />
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
            <option value="grafana-day">Grafana Day</option>
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
              <label className="block text-sm font-medium text-gray-700">Lunch (hh:mm)</label>
              <input
                type="time"
                value={lunchTime}
                onChange={(e) => setLunchTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Extra Hours (hh:mm)</label>
              <input
                type="time"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
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

      <div className="flex justify-end gap-3">
        {onDelete && initialData && (
          <button
            ref={deleteButtonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteEffect(true);
              // Delay the actual delete to show the effect
              setTimeout(() => {
                onDelete();
              }, 600);
            }}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="Delete this entry (cannot be undone)"
          >
            Delete Entry
          </button>
        )}
        <button
          ref={saveButtonRef}
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
    </>
  );
};
