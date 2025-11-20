import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth/AuthService';
import { getUser, saveUser } from '../services/firestore/FirestoreService';

export const SettingsPage: React.FC = () => {
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [vacationAllowance, setVacationAllowance] = useState(25);
  const [yearlyAllowances, setYearlyAllowances] = useState<Record<string, number>>({});
  
  // UI State for adding/editing a year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedYearAllowance, setSelectedYearAllowance] = useState(25);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const userDoc = await getUser(user.uid);
      if (userDoc && userDoc.settings) {
        // Load existing settings
        if (userDoc.settings.schedules && userDoc.settings.schedules.length > 0) {
          setWeeklyHours(userDoc.settings.schedules[0].weeklyHours);
        }
        if (userDoc.settings.vacation) {
          setVacationAllowance(userDoc.settings.vacation.allowanceDays);
          if (userDoc.settings.vacation.yearlyAllowances) {
            setYearlyAllowances(userDoc.settings.vacation.yearlyAllowances);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const settings = {
        schedules: [{
          effectiveDate: '2000-01-01', // Simplified for now
          weeklyHours,
          workDays: [1, 2, 3, 4, 5] // Mon-Fri default
        }],
        vacation: {
          yearStartMonth: 1,
          yearStartDay: 1,
          allowanceDays: vacationAllowance,
          yearlyAllowances
        }
      };

      await saveUser({
        uid: user.uid,
        email: user.email || '',
        settings,
        createdAt: new Date().toISOString() // Ideally preserve original
      });
      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetYearlyAllowance = () => {
    setYearlyAllowances(prev => ({
      ...prev,
      [selectedYear]: selectedYearAllowance
    }));
  };

  const handleRemoveYearlyAllowance = (year: string) => {
    const newAllowances = { ...yearlyAllowances };
    delete newAllowances[year];
    setYearlyAllowances(newAllowances);
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Work Schedule</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Weekly Expected Hours</label>
            <input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            <p className="mt-1 text-sm text-gray-500">
              Total hours expected per week (e.g. 40).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vacation</h3>
          
          <div className="mb-6">
            <label htmlFor="vacation" className="block text-sm font-medium text-gray-700">
              Default Yearly Allowance (Days)
            </label>
            <input
              type="number"
              id="vacation"
              value={vacationAllowance}
              onChange={(e) => setVacationAllowance(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
            <p className="mt-1 text-sm text-gray-500">
              Used if no specific allowance is set for a year.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Yearly Overrides</h4>
            
            <div className="flex gap-2 mb-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                <input 
                  type="number" 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Days</label>
                <input 
                  type="number" 
                  value={selectedYearAllowance}
                  onChange={(e) => setSelectedYearAllowance(Number(e.target.value))}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleSetYearlyAllowance}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
              >
                Set
              </button>
            </div>

            {Object.keys(yearlyAllowances).length > 0 && (
              <ul className="space-y-2">
                {Object.entries(yearlyAllowances).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, days]) => (
                  <li key={year} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100">
                    <span><span className="font-medium">{year}:</span> {days} days</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveYearlyAllowance(year)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
