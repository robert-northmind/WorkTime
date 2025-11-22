import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { batchSaveEntries, batchDeleteEntries, getEntries } from '../services/firestore/FirestoreService';
import type { FirestoreDailyEntry } from '../types/firestore';

interface DeveloperZoneProps {
  user: User | null;
  selectedYear: number;
}

export const DeveloperZone: React.FC<DeveloperZoneProps> = ({ user, selectedYear }) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerateMockData = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage('');
    try {
      const entries: FirestoreDailyEntry[] = [];
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Mon(1) to Fri(5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // Use local date components to avoid timezone shifts
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // Random hours between 4 and 10
          const workHours = 4 + Math.random() * 6;
          const lunchMinutes = 30;
          
          // Start at 08:00
          const startHour = 8;
          const startMin = 0;
          
          // Calculate end time
          const totalMinutes = (workHours * 60) + lunchMinutes;
          const endTotalMinutes = (startHour * 60) + startMin + totalMinutes;
          const endHour = Math.floor(endTotalMinutes / 60);
          const endMin = Math.floor(endTotalMinutes % 60);
          
          const formatTime = (h: number, m: number) => 
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

          entries.push({
            uid: user.uid,
            date: dateStr,
            startTime: formatTime(startHour, startMin),
            endTime: formatTime(endHour, endMin),
            lunchMinutes: lunchMinutes,
            extraHours: 0,
            status: 'work',
            notes: 'Stress Test Mock Entry',
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      await batchSaveEntries(user.uid, entries);
      setMessage(`Successfully generated ${entries.length} mock entries for ${selectedYear}.`);
    } catch (error) {
      console.error('Error generating mock data:', error);
      setMessage('Error generating mock data.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage('');
    try {
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      const existingEntries = await getEntries(user.uid, start, end);
      
      if (existingEntries.length === 0) {
        setMessage(`No entries found to delete for ${selectedYear}.`);
        setSaving(false);
        return;
      }

      const idsToDelete = existingEntries.map(e => `${user.uid}_${e.date}`);
      
      await batchDeleteEntries(user.uid, idsToDelete);
      setMessage(`Successfully deleted ${existingEntries.length} entries for ${selectedYear}.`);
    } catch (error) {
      console.error('Error clearing data:', error);
      setMessage('Error clearing data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-12 pt-6 border-t-2 border-red-100">
      <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ Developer Zone / Stress Test</h3>
      <div className="bg-red-50 p-4 rounded-md border border-red-200 space-y-4">
        <p className="text-sm text-red-800">
          These actions are for testing purposes. They will affect data for the <strong>selected year ({selectedYear})</strong>.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={handleGenerateMockData}
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {saving ? 'Processing...' : `Generate Mock Data (${selectedYear})`}
          </button>

          <button
            type="button"
            onClick={handleClearData}
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {saving ? 'Processing...' : `Clear Year Data (${selectedYear})`}
          </button>
        </div>

        {message && (
          <div className={`p-2 rounded-md text-sm ${message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
