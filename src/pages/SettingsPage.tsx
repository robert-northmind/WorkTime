import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth/AuthService';
import { 
  getUser, 
  saveUser
} from '../services/firestore/FirestoreService';
import { DeveloperZone } from '../components/DeveloperZone';

export const SettingsPage: React.FC = () => {
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Settings State
  const [schedules, setSchedules] = useState<any[]>([]);
  const [vacationSettings, setVacationSettings] = useState<{
    allowanceDays: number;
    yearlyAllowances: Record<string, number>;
  }>({ allowanceDays: 25, yearlyAllowances: {} });
  const [yearlyComments, setYearlyComments] = useState<Record<string, string>>({});

  // Form State for Selected Year
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [vacationDays, setVacationDays] = useState(27);
  const [yearComment, setYearComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const user = getCurrentUser();

  // Generate year options (current year +/- 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  // Update form when selected year or settings change
  useEffect(() => {
    updateFormForYear(selectedYear);
  }, [selectedYear, schedules, vacationSettings, yearlyComments]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const userDoc = await getUser(user.uid);
      if (userDoc && userDoc.settings) {
        if (userDoc.settings.schedules) {
          setSchedules(userDoc.settings.schedules);
        }
        if (userDoc.settings.vacation) {
          setVacationSettings({
            allowanceDays: userDoc.settings.vacation.allowanceDays || 25,
            yearlyAllowances: userDoc.settings.vacation.yearlyAllowances || {}
          });
        }
        if (userDoc.settings.yearlyComments) {
          setYearlyComments(userDoc.settings.yearlyComments);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormForYear = (year: number) => {
    // 1. Weekly Hours
    // Find schedule for this year (effective date YYYY-01-01)
    const yearStart = `${year}-01-01`;
    const schedule = schedules.find(s => s.effectiveDate === yearStart);
    if (schedule) {
      setWeeklyHours(schedule.weeklyHours);
    } else {
      setWeeklyHours(40); // Default
    }

    // 2. Vacation Days
    const allowance = vacationSettings.yearlyAllowances[year.toString()];
    if (allowance !== undefined) {
      setVacationDays(allowance);
    } else {
      setVacationDays(27); // Default as requested
    }

    // 3. Yearly Comment
    setYearComment(yearlyComments[year.toString()] || '');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');

    try {
      // Update Schedules
      const yearStart = `${selectedYear}-01-01`;
      let newSchedules = [...schedules];
      
      // Remove existing schedule for this exact date if it exists
      newSchedules = newSchedules.filter(s => s.effectiveDate !== yearStart);
      
      // Add new schedule
      newSchedules.push({
        effectiveDate: yearStart,
        weeklyHours,
        workDays: [1, 2, 3, 4, 5] // Default Mon-Fri
      });

      // Update Vacation Settings
      const newVacationSettings = {
        ...vacationSettings,
        yearlyAllowances: {
          ...vacationSettings.yearlyAllowances,
          [selectedYear.toString()]: vacationDays
        }
      };

      // Update Yearly Comments
      const newYearlyComments = {
        ...yearlyComments,
        [selectedYear.toString()]: yearComment
      };

      const settings = {
        schedules: newSchedules,
        vacation: {
          yearStartMonth: 1,
          yearStartDay: 1,
          allowanceDays: vacationSettings.allowanceDays, // Keep global default
          yearlyAllowances: newVacationSettings.yearlyAllowances
        },
        yearlyComments: newYearlyComments
      };

      await saveUser({
        uid: user.uid,
        email: user.email || '',
        settings,
        createdAt: new Date().toISOString() // Ideally preserve original
      });

      // Update local state
      setSchedules(newSchedules);
      setVacationSettings(newVacationSettings);
      setYearlyComments(newYearlyComments);
      
      setMessage(`Settings for ${selectedYear} saved successfully!`);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      
      <div className="mb-8 bg-blue-50 p-4 rounded-md border border-blue-100">
        <label htmlFor="year-select" className="block text-sm font-medium text-blue-900 mb-2">
          Configure Settings for Year
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="block w-full max-w-xs rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-blue-700">
          Settings are saved specifically for the selected year.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Work Schedule ({selectedYear})</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Weekly Expected Hours</label>
            <input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            <p className="mt-1 text-sm text-gray-500">
              Total hours expected per week for {selectedYear} (Default: 40).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vacation ({selectedYear})</h3>
          
          <div>
            <label htmlFor="vacation" className="block text-sm font-medium text-gray-700">
              Yearly Allowance (Days)
            </label>
            <input
              type="number"
              id="vacation"
              value={vacationDays}
              onChange={(e) => setVacationDays(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
            <p className="mt-1 text-sm text-gray-500">
              Total vacation days allowed for {selectedYear} (Default: 27).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes ({selectedYear})</h3>
          
          <div>
            <label htmlFor="yearComment" className="block text-sm font-medium text-gray-700">
              Yearly Comment
            </label>
            <textarea
              id="yearComment"
              value={yearComment}
              onChange={(e) => setYearComment(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 sm:text-sm"
              placeholder={`Add notes about ${selectedYear} configuration...`}
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional notes to remember why settings were configured this way.
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${message.includes('Failed') || message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save Settings for ${selectedYear}`}
          </button>
        </div>
      </form>

      {/* Stress Test / Developer Zone */}
      <DeveloperZone user={user} selectedYear={selectedYear} />
    </div>
  );
};
