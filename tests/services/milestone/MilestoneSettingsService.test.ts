import {
  createMilestoneFromDraft,
  normalizeStartDate,
  removeMilestoneFromList,
  toEditableMilestone,
  updateMilestoneInList,
} from '../../../src/services/milestone/MilestoneSettingsService';
import type { Milestone } from '../../../src/types/firestore';

describe('MilestoneSettingsService', () => {
  it('normalizes empty startDate to undefined', () => {
    expect(normalizeStartDate('')).toBeUndefined();
    expect(normalizeStartDate(undefined)).toBeUndefined();
    expect(normalizeStartDate('2024-01-01')).toBe('2024-01-01');
  });

  it('creates a milestone from draft with trimmed name', () => {
    const milestone = createMilestoneFromDraft(
      { name: '  Q1  ', date: '2024-03-31', startDate: '', type: 'period' },
      'abc'
    );

    expect(milestone).toEqual({
      id: 'abc',
      name: 'Q1',
      date: '2024-03-31',
      startDate: undefined,
      type: 'period',
    });
  });

  it('converts milestone into editable milestone shape', () => {
    const milestone: Milestone = { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' };
    expect(toEditableMilestone(milestone).startDate).toBe('');
  });

  it('updates milestone in list and trims name', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ];

    const updated = updateMilestoneInList(milestones, {
      id: '2',
      name: '  Updated Q2  ',
      date: '2024-07-01',
      startDate: '',
      type: 'event',
    });

    expect(updated).toEqual([
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Updated Q2', date: '2024-07-01', startDate: undefined, type: 'event' },
    ]);
  });

  it('removes milestone by id', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ];

    expect(removeMilestoneFromList(milestones, '1')).toEqual([
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ]);
  });
});
