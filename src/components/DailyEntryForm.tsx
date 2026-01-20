import React, { useState, useEffect, useRef } from 'react';
import type { DailyEntry } from '../services/balance/BalanceService';
import type { FirestoreDailyEntry, CustomPTOType } from '../types/firestore';
import { getUser } from '../services/firestore/FirestoreService';
import { SuccessConfetti } from './SuccessConfetti';
import { DeleteEffect } from './DeleteEffect';
import { minutesToTime, timeToMinutes } from '../services/time/TimeService';
import { getTimeInputValue } from '../services/time/TimeFormatService';

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
  const [customPTO, setCustomPTO] = useState<CustomPTOType[]>([]);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userDoc = await getUser(uid);
        if (userDoc?.settings?.customPTO) {
          setCustomPTO(userDoc.settings.customPTO);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, [uid]);

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
      <form onSubmit={handleSubmit} className="relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-lg rounded-xl p-6 space-y-5 border-t-4 border-indigo-500">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Entry for {date}</h3>
        </div>
      
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DailyEntry['status'])}
            className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 font-medium"
          >
            <option value="work">Work</option>
            <option value="vacation">Vacation</option>
            <option value="holiday">Holiday</option>
            <option value="sick">Sick</option>
            {customPTO.map(pto => (
              <option key={pto.id} value={pto.id}>{pto.name}</option>
            ))}
          </select>
        </div>

        {status === 'work' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
              <input
                type="time"
                value={getTimeInputValue(startTime)}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
              <input
                type="time"
                value={getTimeInputValue(endTime)}
                onChange={(e) => setEndTime(e.target.value)}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lunch (hh:mm)</label>
              <input
                type="time"
                value={lunchTime}
                onChange={(e) => setLunchTime(e.target.value)}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 font-medium"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Extra Hours (hh:mm)</label>
          <input
            type="time"
            value={extraTime}
            onChange={(e) => setExtraTime(e.target.value)}
            className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 font-medium"
          />
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes about this day..."
          className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3 bg-white/80 placeholder:text-gray-400"
        />
      </div>

      <div className="relative flex justify-end gap-3 pt-2">
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
            className="inline-flex items-center justify-center py-2.5 px-5 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all duration-200"
            title="Delete this entry (cannot be undone)"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
        <button
          ref={saveButtonRef}
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent shadow-lg text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Entry
            </>
          )}
        </button>
      </div>
    </form>
    </>
  );
};
