import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth/AuthService';
import { 
  getUser, 
  saveUser
} from '../services/firestore/FirestoreService';
import type { CustomPTOType } from '../types/firestore';
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
  
  // PTO Settings
  const [customPTO, setCustomPTO] = useState<CustomPTOType[]>([]);
  const [ptoColors, setPtoColors] = useState<Record<string, string>>({
    work: '#0b9d3e',
    vacation: '#6da5ee',
    holiday: '#fd3fae',
    sick: '#f98080',
  });
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');

  // Form State for Selected Year
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [vacationDays, setVacationDays] = useState(27);
  const [yearComment, setYearComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [yearlyMessage, setYearlyMessage] = useState('');
  const [globalMessage, setGlobalMessage] = useState('');

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
        if (userDoc.settings.customPTO) {
          setCustomPTO(userDoc.settings.customPTO);
        }
        if (userDoc.settings.ptoColors) {
          setPtoColors(prev => ({ ...prev, ...userDoc.settings.ptoColors }));
        }
        if (userDoc.settings.timeFormat) {
          setTimeFormat(userDoc.settings.timeFormat);
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

  const handleSaveYearly = async () => {
    if (!user) return;
    setSaving(true);
    setYearlyMessage('');
    setGlobalMessage('');

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
        yearlyComments: newYearlyComments,
        customPTO, // Preserve current global settings
        ptoColors, // Preserve current global settings
      };

      await saveUser({
        uid: user.uid,
        email: user.email || '',
        settings,
        createdAt: new Date().toISOString()
      });

      // Update local state
      setSchedules(newSchedules);
      setVacationSettings(newVacationSettings);
      setYearlyComments(newYearlyComments);
      
      setYearlyMessage(`Yearly settings for ${selectedYear} saved successfully!`);
      
      // Clear message after 3 seconds
      setTimeout(() => setYearlyMessage(''), 3000);
    } catch (error) {
      console.error('Error saving yearly settings:', error);
      setYearlyMessage('Error saving yearly settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobal = async () => {
    if (!user) return;
    setSaving(true);
    setGlobalMessage('');
    setYearlyMessage('');

    try {
      const settings = {
        schedules, // Preserve current yearly settings
        vacation: {
          yearStartMonth: 1,
          yearStartDay: 1,
          allowanceDays: vacationSettings.allowanceDays,
          yearlyAllowances: vacationSettings.yearlyAllowances
        },
        yearlyComments, // Preserve current yearly settings
        customPTO,
        ptoColors,
        timeFormat,
      };

      await saveUser({
        uid: user.uid,
        email: user.email || '',
        settings,
        createdAt: new Date().toISOString()
      });
      
      setGlobalMessage('Global settings saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setGlobalMessage(''), 3000);
    } catch (error) {
      console.error('Error saving global settings:', error);
      setGlobalMessage('Error saving global settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      
      <div className="space-y-8">
        
        {/* Yearly Configuration Section */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200 pb-4 gap-4 sm:gap-0">
            <h3 className="text-lg font-medium text-blue-900">Yearly Configuration</h3>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label htmlFor="year-select" className="text-sm font-medium text-blue-900">Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-24 rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-3 uppercase tracking-wider">Work Schedule</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700">Weekly Expected Hours</label>
              <input
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                Total hours expected per week for {selectedYear} (Default: 40).
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-3 uppercase tracking-wider">Vacation</h4>
            <div>
              <label htmlFor="vacation" className="block text-sm font-medium text-gray-700">
                Yearly Allowance (Days)
              </label>
              <input
                type="number"
                id="vacation"
                value={vacationDays}
                onChange={(e) => setVacationDays(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Total vacation days allowed for {selectedYear} (Default: 27).
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-3 uppercase tracking-wider">Notes</h4>
            <div>
              <label htmlFor="yearComment" className="block text-sm font-medium text-gray-700">
                Yearly Comment
              </label>
              <textarea
                id="yearComment"
                value={yearComment}
                onChange={(e) => setYearComment(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 sm:text-sm"
                placeholder={`Add notes about ${selectedYear} configuration...`}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-2">
            {yearlyMessage && (
              <span className={`text-sm ${yearlyMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} w-full sm:w-auto text-center sm:text-right`}>
                {yearlyMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveYearly}
              disabled={saving}
              className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save Yearly Settings (${selectedYear})`}
            </button>
          </div>
        </div>

        {/* Global Configuration Section */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900">Global Configuration</h3>
            <p className="mt-1 text-xs text-gray-500">These settings apply to all years.</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">Time Format</h4>
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <p className="text-sm text-gray-600 mb-3">Choose how times are displayed throughout the app:</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="24h"
                    checked={timeFormat === '24h'}
                    onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">24-hour format (e.g., 13:30)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="12h"
                    checked={timeFormat === '12h'}
                    onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">12-hour format (e.g., 1:30 PM)</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">Fixed PTO Colors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['work', 'vacation', 'holiday', 'sick'].map((type) => (
                <div key={type} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                  <span className="capitalize text-sm text-gray-700">{type}</span>
                  <input
                    type="color"
                    value={ptoColors[type] || '#ffffff'}
                    onChange={(e) => setPtoColors({ ...ptoColors, [type]: e.target.value })}
                    className="h-8 w-14 p-0 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider">Custom PTO Types</h4>
              <button
                type="button"
                onClick={() => {
                  const newId = Date.now().toString();
                  setCustomPTO([...customPTO, { id: newId, name: 'New Type', color: '#fb923c' }]);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                + Add Type
              </button>
            </div>
            
            {customPTO.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No custom PTO types added.</p>
            ) : (
              <div className="space-y-3">
                {customPTO.map((pto, index) => (
                  <div key={pto.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-md">
                    <input
                      type="text"
                      value={pto.name}
                      onChange={(e) => {
                        const newPTO = [...customPTO];
                        newPTO[index].name = e.target.value;
                        setCustomPTO(newPTO);
                      }}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border"
                      placeholder="Type Name"
                    />
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="color"
                        value={pto.color}
                        onChange={(e) => {
                          const newPTO = [...customPTO];
                          newPTO[index].color = e.target.value;
                          setCustomPTO(newPTO);
                        }}
                        className="h-9 w-14 p-0 block bg-white border border-gray-300 rounded-md cursor-pointer flex-shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPTO = customPTO.filter(p => p.id !== pto.id);
                          setCustomPTO(newPTO);
                        }}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ml-auto sm:ml-0"
                        title="Delete Type"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-2">
            {globalMessage && (
              <span className={`text-sm ${globalMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} w-full sm:w-auto text-center sm:text-right`}>
                {globalMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveGlobal}
              disabled={saving}
              className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Global Settings'}
            </button>
          </div>
        </div>


      </div>

      {/* Stress Test / Developer Zone */}
      {import.meta.env.DEV && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Advanced</h3>
          <DeveloperZone user={user} selectedYear={selectedYear} />
        </div>
      )}
    </div>
  );
};
