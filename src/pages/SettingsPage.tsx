import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../services/auth/AuthService';
import { 
  getUser, 
  saveUser,
  getEntries,
  batchSaveEntries
} from '../services/firestore/FirestoreService';
import type { CustomPTOType, Milestone } from '../types/firestore';
import { sortMilestonesByDate } from '../services/milestone/MilestoneService';
import {
  createMilestoneFromDraft,
  removeMilestoneFromList,
  toEditableMilestone,
  updateMilestoneInList,
} from '../services/milestone/MilestoneSettingsService';
import { DeveloperZone } from '../components/DeveloperZone';
import {
  type PTOUsageData,
  archiveCustomPTOType,
  buildReassignOptions,
  fetchPTOUsage,
  getStatusLabel,
  persistCustomPTOSettings,
  reassignEntriesStatus,
  removeCustomPTOType,
  restoreCustomPTOType,
} from '../services/pto/CustomPTOService';

export const SettingsPage: React.FC = () => {
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Settings State
  const [schedules, setSchedules] = useState<Array<{
    effectiveDate: string;
    weeklyHours: number;
    workDays: number[];
  }>>([]);
  const [vacationSettings, setVacationSettings] = useState<{
    allowanceDays: number;
    yearlyAllowances: Record<string, number>;
  }>({ allowanceDays: 25, yearlyAllowances: {} });
  const [yearlyComments, setYearlyComments] = useState<Record<string, string>>({});
  const [yearlyMilestones, setYearlyMilestones] = useState<Record<string, Milestone[]>>({});
  
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
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState<Omit<Milestone, 'id'>>({ name: '', date: '', startDate: '', type: 'period' });
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [pendingDeleteMilestone, setPendingDeleteMilestone] = useState<Milestone | null>(null);
  const deleteMilestoneDialogRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [yearlyMessage, setYearlyMessage] = useState('');
  const [globalMessage, setGlobalMessage] = useState('');
  const [checkingDeletePTOId, setCheckingDeletePTOId] = useState<string | null>(null);
  const [deleteModalType, setDeleteModalType] = useState<CustomPTOType | null>(null);
  const [deleteModalUsage, setDeleteModalUsage] = useState<PTOUsageData | null>(null);
  const [deleteModalStep, setDeleteModalStep] = useState<'choice' | 'reassign'>('choice');
  const [reassignTargetStatus, setReassignTargetStatus] = useState('');
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

  const user = getCurrentUser();

  // Generate year options (current year +/- 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    if (!user) return;
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update form when selected year or settings change
  useEffect(() => {
    updateFormForYear(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, schedules, vacationSettings, yearlyComments, yearlyMilestones]);

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
        if (userDoc.settings.yearlyMilestones) {
          setYearlyMilestones(userDoc.settings.yearlyMilestones);
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

    // 4. Milestones
    const yearMilestones = yearlyMilestones[year.toString()] || [];
    setMilestones(sortMilestonesByDate(yearMilestones));
    setShowAddMilestone(false);
    setNewMilestone({ name: '', date: `${year}-12-31`, startDate: '', type: 'period' });
  };

  const handleAddMilestone = () => {
    if (!newMilestone.name.trim() || !newMilestone.date) return;

    const id = Date.now().toString();
    setMilestones([...milestones, createMilestoneFromDraft(newMilestone, id)]);
    setShowAddMilestone(false);
    setNewMilestone({ name: '', date: `${selectedYear}-12-31`, startDate: '', type: 'period' });
  };

  const openEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(toEditableMilestone(milestone));
  };

  const closeEditMilestone = () => {
    setEditingMilestone(null);
  };

  const handleUpdateMilestone = () => {
    if (!editingMilestone || !editingMilestone.name.trim() || !editingMilestone.date) return;

    setMilestones(updateMilestoneInList(milestones, editingMilestone));
    closeEditMilestone();
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setMilestones(removeMilestoneFromList(milestones, milestoneId));
    if (editingMilestone?.id === milestoneId) {
      closeEditMilestone();
    }
  };

  const requestDeleteMilestone = (milestone: Milestone) => {
    setPendingDeleteMilestone(milestone);
  };

  const cancelDeleteMilestone = () => {
    setPendingDeleteMilestone(null);
  };

  const confirmDeleteMilestone = () => {
    if (!pendingDeleteMilestone) return;

    handleDeleteMilestone(pendingDeleteMilestone.id);
    setPendingDeleteMilestone(null);
  };

  useEffect(() => {
    if (!pendingDeleteMilestone) return;

    const dialog = deleteMilestoneDialogRef.current;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusableElements = () =>
      dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
          )
        : [];

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialog?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelDeleteMilestone();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentFocusableElements = getFocusableElements();
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [pendingDeleteMilestone]);

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

      // Update Yearly Milestones
      const newYearlyMilestones = {
        ...yearlyMilestones,
        [selectedYear.toString()]: milestones
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
        yearlyMilestones: newYearlyMilestones,
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
      setYearlyMilestones(newYearlyMilestones);
      
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
        yearlyMilestones, // Preserve current yearly settings
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

  const closeDeleteModal = () => {
    setDeleteModalType(null);
    setDeleteModalUsage(null);
    setDeleteModalStep('choice');
    setReassignTargetStatus('');
    setDeleteActionLoading(false);
  };

  const persistNextCustomPTO = async (nextCustomPTO: CustomPTOType[]) => {
    if (!user) throw new Error('User not authenticated');

    const fallbackSettings = {
      schedules,
      vacation: {
        yearStartMonth: 1,
        yearStartDay: 1,
        allowanceDays: vacationSettings.allowanceDays,
        yearlyAllowances: vacationSettings.yearlyAllowances
      },
      yearlyComments,
      yearlyMilestones,
      ptoColors,
      timeFormat,
    };

    await persistCustomPTOSettings({
      uid: user.uid,
      currentEmail: user.email || '',
      nextCustomPTO,
      fallbackSettings,
      getUserFn: getUser,
      saveUserFn: saveUser,
    });
  };

  const handleDeleteCustomType = async (pto: CustomPTOType) => {
    if (!user) return;

    setGlobalMessage('');
    setYearlyMessage('');
    setCheckingDeletePTOId(pto.id);

    try {
      const usage = await fetchPTOUsage(user.uid, pto.id, getEntries);

      if (usage.affectedEntries.length === 0) {
        const nextCustomPTO = removeCustomPTOType(customPTO, pto.id);
        await persistNextCustomPTO(nextCustomPTO);
        setCustomPTO(nextCustomPTO);
        setGlobalMessage(`Deleted "${pto.name}".`);
        setTimeout(() => setGlobalMessage(''), 3000);
        return;
      }

      setDeleteModalType(pto);
      setDeleteModalUsage(usage);
      setDeleteModalStep('choice');
      setReassignTargetStatus('');
    } catch (error) {
      console.error('Error checking PTO usage:', error);
      setGlobalMessage('Error checking PTO usage.');
      setTimeout(() => setGlobalMessage(''), 3000);
    } finally {
      setCheckingDeletePTOId(null);
    }
  };

  const handleArchiveCustomType = async () => {
    if (!deleteModalType) return;

    setDeleteActionLoading(true);
    try {
      const nextCustomPTO = archiveCustomPTOType(customPTO, deleteModalType.id);
      await persistNextCustomPTO(nextCustomPTO);
      setCustomPTO(nextCustomPTO);
      closeDeleteModal();
      setGlobalMessage(`Archived "${deleteModalType.name}". Existing entries keep this type.`);
      setTimeout(() => setGlobalMessage(''), 4000);
    } catch (error) {
      console.error('Error archiving custom PTO type:', error);
      setGlobalMessage('Error archiving custom PTO type.');
      setTimeout(() => setGlobalMessage(''), 3000);
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const handleRestoreCustomType = async (ptoId: string) => {
    setCheckingDeletePTOId(ptoId);
    try {
      const nextCustomPTO = restoreCustomPTOType(customPTO, ptoId);
      await persistNextCustomPTO(nextCustomPTO);
      setCustomPTO(nextCustomPTO);
      setGlobalMessage('Custom PTO type restored.');
      setTimeout(() => setGlobalMessage(''), 3000);
    } catch (error) {
      console.error('Error restoring custom PTO type:', error);
      setGlobalMessage('Error restoring custom PTO type.');
      setTimeout(() => setGlobalMessage(''), 3000);
    } finally {
      setCheckingDeletePTOId(null);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!user || !deleteModalType || !deleteModalUsage || !reassignTargetStatus) return;

    setDeleteActionLoading(true);
    try {
      const updatedEntries = reassignEntriesStatus(
        deleteModalUsage.affectedEntries,
        reassignTargetStatus
      );

      if (updatedEntries.length > 0) {
        await batchSaveEntries(user.uid, updatedEntries);
      }

      const nextCustomPTO = removeCustomPTOType(customPTO, deleteModalType.id);
      await persistNextCustomPTO(nextCustomPTO);
      setCustomPTO(nextCustomPTO);

      const targetLabel = getStatusLabel(reassignTargetStatus, customPTO);
      closeDeleteModal();
      setGlobalMessage(
        `Reassigned ${updatedEntries.length} entries to "${targetLabel}" and deleted "${deleteModalType.name}".`
      );
      setTimeout(() => setGlobalMessage(''), 5000);
    } catch (error) {
      console.error('Error reassigning and deleting custom PTO type:', error);
      setGlobalMessage('Error reassigning entries and deleting type.');
      setTimeout(() => setGlobalMessage(''), 3000);
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const reassignOptions = buildReassignOptions(customPTO, deleteModalType?.id);

  if (loading) return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-slate-50 to-white shadow-lg rounded-xl p-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-32"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      
      <div className="space-y-6">
        
        {/* Yearly Configuration Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50/80 via-white to-white shadow-lg rounded-xl border-t-4 border-cyan-500 p-6 space-y-6">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-200 pb-4 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Yearly Configuration</h3>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-600">Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-24 rounded-xl border-cyan-200 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2 font-medium bg-white/80"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <h4 className="text-xs font-semibold text-cyan-700 mb-3 uppercase tracking-wider">Work Schedule</h4>
            <div className="bg-white/60 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Weekly Expected Hours</label>
              <input
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-3 bg-white font-medium"
              />
              <p className="mt-2 text-xs text-gray-500">
                Total hours expected per week for {selectedYear} (Default: 40).
              </p>
            </div>
          </div>

          <div className="relative">
            <h4 className="text-xs font-semibold text-cyan-700 mb-3 uppercase tracking-wider">Vacation</h4>
            <div className="bg-white/60 rounded-xl p-4">
              <label htmlFor="vacation" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Yearly Allowance (Days)
              </label>
              <input
                type="number"
                id="vacation"
                value={vacationDays}
                onChange={(e) => setVacationDays(Number(e.target.value))}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 border p-3 sm:text-sm bg-white font-medium"
              />
              <p className="mt-2 text-xs text-gray-500">
                Total vacation days allowed for {selectedYear} (Default: 27).
              </p>
            </div>
          </div>

          <div className="relative">
            <h4 className="text-xs font-semibold text-cyan-700 mb-3 uppercase tracking-wider">Notes</h4>
            <div className="bg-white/60 rounded-xl p-4">
              <label htmlFor="yearComment" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Yearly Comment
              </label>
              <textarea
                id="yearComment"
                value={yearComment}
                onChange={(e) => setYearComment(e.target.value)}
                rows={2}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 border p-3 sm:text-sm bg-white placeholder:text-gray-400"
                placeholder={`Add notes about ${selectedYear} configuration...`}
              />
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">Milestones</h4>
              {!showAddMilestone && (
                <button
                  type="button"
                  onClick={() => {
                    setNewMilestone({ name: '', date: `${selectedYear}-12-31`, startDate: '', type: 'period' });
                    setShowAddMilestone(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-cyan-700 bg-cyan-100 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Milestone
                </button>
              )}
            </div>

            {/* Add Milestone Form */}
            {showAddMilestone && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMilestone.name}
                      onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                      placeholder="Milestone name (e.g., FY26 Q4)"
                      className="flex-1 px-3 py-2 rounded-lg border-cyan-200 focus:ring-cyan-500 focus:border-cyan-500 text-sm border bg-white"
                      autoFocus
                    />
                    <select
                      value={newMilestone.type}
                      onChange={(e) => setNewMilestone({ ...newMilestone, type: e.target.value as 'period' | 'event' })}
                      className="px-3 py-2 rounded-lg border-cyan-200 focus:ring-cyan-500 focus:border-cyan-500 text-sm border bg-white"
                    >
                      <option value="period">Period</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-cyan-700 whitespace-nowrap">
                        Start date:
                      </label>
                      <input
                        type="date"
                        value={newMilestone.startDate || ''}
                        onChange={(e) => setNewMilestone({ ...newMilestone, startDate: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border-cyan-200 focus:ring-cyan-500 focus:border-cyan-500 text-sm border bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-cyan-700 whitespace-nowrap">
                        {newMilestone.type === 'period' ? 'End date:' : 'Date:'}
                      </label>
                      <input
                        type="date"
                        value={newMilestone.date}
                        onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border-cyan-200 focus:ring-cyan-500 focus:border-cyan-500 text-sm border bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAddMilestone(false)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMilestone}
                        disabled={!newMilestone.name.trim() || !newMilestone.date}
                        className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                </div>
              </div>
            )}

            {/* Milestone Cards */}
            {milestones.length === 0 && !showAddMilestone ? (
              <div className="bg-white/60 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">No milestones for {selectedYear}.</p>
                <p className="text-xs text-gray-400 mt-1">Track fiscal quarters, deadlines, or product launches.</p>
              </div>
            ) : milestones.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sortMilestonesByDate(milestones).map((milestone) => (
                  <div
                    key={milestone.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEditMilestone(milestone)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEditMilestone(milestone);
                      }
                    }}
                    className="group flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 transition-colors hover:border-cyan-300 hover:bg-cyan-50/50 cursor-pointer"
                  >
                    <div className="flex min-w-0 flex-1 flex-col text-left">
                      <span className="truncate text-sm font-medium text-gray-800">{milestone.name}</span>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          milestone.type === 'period'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {milestone.type === 'period' ? 'Period' : 'Event'}
                        </span>
                        {milestone.startDate && (
                          <span>
                            {new Date(milestone.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' - '}
                          </span>
                        )}
                        <span>{new Date(milestone.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteMilestone(milestone);
                      }}
                      className="ml-1 shrink-0 rounded p-1 text-gray-400 opacity-70 transition hover:text-rose-500 hover:opacity-100 focus-visible:opacity-100"
                      title="Delete milestone"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


          {pendingDeleteMilestone && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
              onClick={cancelDeleteMilestone}
            >
              <div
                ref={deleteMilestoneDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-milestone-title"
                aria-describedby="delete-milestone-description"
                tabIndex={-1}
                className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h5 id="delete-milestone-title" className="text-base font-semibold text-gray-900">Delete milestone?</h5>
                <p id="delete-milestone-description" className="mt-2 text-sm text-gray-600">
                  "{pendingDeleteMilestone.name}" will be removed from {selectedYear}. This action can’t be undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelDeleteMilestone}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMilestone}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingMilestone && (
            <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
              <div className="my-6 w-full max-w-md space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h5 className="text-base font-semibold text-gray-900">Edit Milestone</h5>
                  <button
                    type="button"
                    onClick={closeEditMilestone}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close milestone edit modal"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingMilestone.name}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-cyan-500 focus:border-cyan-500 text-base sm:text-sm"
                    placeholder="Milestone name"
                  />
                  <select
                    value={editingMilestone.type}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, type: e.target.value as 'period' | 'event' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-cyan-500 focus:border-cyan-500 text-base sm:text-sm bg-white"
                  >
                    <option value="period">Period</option>
                    <option value="event">Event</option>
                  </select>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label className="block text-xs text-gray-500 mb-1">Start date (optional)</label>
                      <input
                        type="date"
                        value={editingMilestone.startDate || ''}
                        onChange={(e) => setEditingMilestone({ ...editingMilestone, startDate: e.target.value })}
                        className="block w-full min-w-0 max-w-full [min-inline-size:0] px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs text-gray-500 mb-1">{editingMilestone.type === 'period' ? 'End date' : 'Date'}</label>
                      <input
                        type="date"
                        value={editingMilestone.date}
                        onChange={(e) => setEditingMilestone({ ...editingMilestone, date: e.target.value })}
                        className="block w-full min-w-0 max-w-full [min-inline-size:0] px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(editingMilestone.id)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-700"
                  >
                    Delete
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeEditMilestone}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateMilestone}
                      disabled={!editingMilestone.name.trim() || !editingMilestone.date}
                      className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-2">
            {yearlyMessage && (
              <span className={`text-sm font-medium ${yearlyMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'} w-full sm:w-auto text-center sm:text-right`}>
                {yearlyMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveYearly}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 border border-transparent shadow-lg text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 transition-all duration-200"
            >
              {saving ? (
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
                  Save {selectedYear} Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Configuration Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50/80 via-white to-white shadow-lg rounded-xl border-t-4 border-violet-500 p-6 space-y-6">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          
          <div className="relative border-b border-violet-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Global Configuration</h3>
                <p className="text-xs text-gray-500">These settings apply to all years.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <h4 className="text-xs font-semibold text-violet-700 mb-3 uppercase tracking-wider">Time Format</h4>
            <div className="bg-white/60 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-3">Choose how times are displayed throughout the app:</p>
              <div className="space-y-3">
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${timeFormat === '24h' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200'}`}>
                  <input
                    type="radio"
                    name="timeFormat"
                    value="24h"
                    checked={timeFormat === '24h'}
                    onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">24-hour format <span className="text-gray-400">(e.g., 13:30)</span></span>
                </label>
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${timeFormat === '12h' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200'}`}>
                  <input
                    type="radio"
                    name="timeFormat"
                    value="12h"
                    checked={timeFormat === '12h'}
                    onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">12-hour format <span className="text-gray-400">(e.g., 1:30 PM)</span></span>
                </label>
              </div>
            </div>
          </div>

          <div className="relative">
            <h4 className="text-xs font-semibold text-violet-700 mb-3 uppercase tracking-wider">Fixed PTO Colors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['work', 'vacation', 'holiday', 'sick'].map((type) => (
                <div key={type} className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="capitalize text-sm font-medium text-gray-700">{type}</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: ptoColors[type] || '#ffffff' }}
                    />
                    <input
                      type="color"
                      value={ptoColors[type] || '#ffffff'}
                      onChange={(e) => setPtoColors({ ...ptoColors, [type]: e.target.value })}
                      className="h-8 w-12 p-0 block bg-white border border-gray-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Custom PTO Types</h4>
              <button
                type="button"
                onClick={() => {
                  const newId = Date.now().toString();
                  setCustomPTO([...customPTO, { id: newId, name: 'New Type', color: '#fb923c' }]);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-violet-700 bg-violet-100 hover:bg-violet-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Type
              </button>
            </div>
            
            {customPTO.length === 0 ? (
              <div className="bg-white/60 rounded-xl p-6 text-center">
                <svg className="mx-auto h-10 w-10 text-violet-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-sm text-gray-500">No custom PTO types added.</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Type" to create one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customPTO.map((pto, index) => (
                  <div
                    key={pto.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl ${
                      pto.archived ? 'bg-slate-100/70 border border-slate-200' : 'bg-white/60'
                    }`}
                  >
                    <input
                      type="text"
                      value={pto.name}
                      onChange={(e) => {
                        const newPTO = [...customPTO];
                        newPTO[index].name = e.target.value;
                        setCustomPTO(newPTO);
                      }}
                      className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-xl border-gray-200 focus:ring-violet-500 focus:border-violet-500 sm:text-sm border font-medium"
                      placeholder="Type Name"
                    />
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {pto.archived && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
                          Archived
                        </span>
                      )}
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: pto.color }}
                      />
                      <input
                        type="color"
                        value={pto.color}
                        onChange={(e) => {
                          const newPTO = [...customPTO];
                          newPTO[index].color = e.target.value;
                          setCustomPTO(newPTO);
                        }}
                        className="h-9 w-14 p-0 block bg-white border border-gray-200 rounded-lg cursor-pointer flex-shrink-0"
                      />
                      {pto.archived && (
                        <button
                          type="button"
                          onClick={() => handleRestoreCustomType(pto.id)}
                          disabled={checkingDeletePTOId === pto.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-xl text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 disabled:opacity-50 transition-colors"
                          title="Restore Type"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomType(pto)}
                        disabled={checkingDeletePTOId === pto.id}
                        className="inline-flex items-center p-2 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 ml-auto sm:ml-0 transition-all"
                        title={pto.archived ? 'Delete Type Permanently' : 'Delete Type'}
                      >
                        {checkingDeletePTOId === pto.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Archived custom PTO types stay on historical entries but are hidden from new entry selection.
            </p>
          </div>

          <div className="relative flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-2">
            {globalMessage && (
              <span className={`text-sm font-medium ${globalMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-600'} w-full sm:w-auto text-center sm:text-right`}>
                {globalMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveGlobal}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 border border-transparent shadow-lg text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-all duration-200"
            >
              {saving ? (
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
                  Save Global Settings
                </>
              )}
            </button>
          </div>
        </div>


      </div>

      {deleteModalType && deleteModalUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!deleteActionLoading) closeDeleteModal();
            }}
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete "{deleteModalType.name}"</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This type is used by {deleteModalUsage.affectedEntries.length} entries across {deleteModalUsage.yearlyCounts.length} year(s). Custom PTO types are global and affect all years.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteActionLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Yearly Impact</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {deleteModalUsage.yearlyCounts.map((item) => (
                  <div key={item.year} className="flex items-center justify-between text-sm text-slate-700">
                    <span>{item.year}</span>
                    <span className="font-semibold">{item.count} entries</span>
                  </div>
                ))}
              </div>
            </div>

            {deleteModalStep === 'choice' ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleArchiveCustomType}
                  disabled={deleteActionLoading}
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 disabled:opacity-50 transition-colors"
                >
                  {deleteActionLoading ? 'Archiving...' : 'Archive'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalStep('reassign');
                    setReassignTargetStatus('');
                  }}
                  disabled={deleteActionLoading}
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 transition-all"
                >
                  Reassign + Delete
                </button>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteActionLoading}
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Reassign all affected entries to
                  </label>
                  <select
                    value={reassignTargetStatus}
                    onChange={(e) => setReassignTargetStatus(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 border p-3 bg-white text-sm"
                  >
                    <option value="">Select a target status</option>
                    {reassignOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {reassignOptions.length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No valid reassignment targets available. Please create a PTO type first or archive instead.
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteModalStep('choice')}
                    disabled={deleteActionLoading}
                    className="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReassignAndDelete}
                    disabled={!reassignTargetStatus || deleteActionLoading}
                    className="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all"
                  >
                    {deleteActionLoading ? 'Applying...' : 'Apply Reassignment + Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stress Test / Developer Zone */}
      {import.meta.env.DEV && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Developer Zone</h3>
          </div>
          <DeveloperZone user={user} selectedYear={selectedYear} />
        </div>
      )}
    </div>
  );
};
