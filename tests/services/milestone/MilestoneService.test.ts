import {
  calculateWeeksUntil,
  formatMilestoneText,
  findNextMilestone,
  sortMilestonesByDate,
  collectRelevantMilestones,
  getNextMilestoneDisplay,
  type Milestone,
} from '../../../src/services/milestone/MilestoneService';

describe('calculateWeeksUntil', () => {
  it('returns 0 when target date equals today', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-03-15')).toBe(0);
  });

  it('returns 1 when target is 7 days away', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-03-22')).toBe(1);
  });

  it('returns 1 when target is 1-6 days away (partial week)', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-03-18')).toBe(1);
  });

  it('returns 2 when target is 8-14 days away', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-03-25')).toBe(2);
  });

  it('returns 5 when target is exactly 5 weeks away', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-04-19')).toBe(5);
  });

  it('returns negative number when target date is in the past', () => {
    expect(calculateWeeksUntil('2024-03-15', '2024-03-01')).toBe(-2);
  });

  it('handles year boundaries correctly', () => {
    expect(calculateWeeksUntil('2024-12-25', '2025-01-08')).toBe(2);
  });
});

describe('formatMilestoneText', () => {
  describe('period type', () => {
    it('returns correct text for multiple weeks', () => {
      const milestone: Milestone = { id: '1', name: 'FY27 Q1', date: '2027-03-31', type: 'period' };
      expect(formatMilestoneText(milestone, 5)).toBe('5 weeks left in FY27 Q1');
    });

    it('returns singular form for 1 week', () => {
      const milestone: Milestone = { id: '1', name: 'FY27 Q1', date: '2027-03-31', type: 'period' };
      expect(formatMilestoneText(milestone, 1)).toBe('1 week left in FY27 Q1');
    });

    it('returns correct text for 0 weeks (final week)', () => {
      const milestone: Milestone = { id: '1', name: 'FY27 Q1', date: '2027-03-31', type: 'period' };
      expect(formatMilestoneText(milestone, 0)).toBe('Final week of FY27 Q1');
    });
  });

  describe('event type', () => {
    it('returns correct text for multiple weeks', () => {
      const milestone: Milestone = { id: '1', name: 'Product Launch', date: '2027-05-15', type: 'event' };
      expect(formatMilestoneText(milestone, 5)).toBe('5 weeks until Product Launch');
    });

    it('returns singular form for 1 week', () => {
      const milestone: Milestone = { id: '1', name: 'Product Launch', date: '2027-05-15', type: 'event' };
      expect(formatMilestoneText(milestone, 1)).toBe('1 week until Product Launch');
    });

    it('returns correct text for 0 weeks (this week)', () => {
      const milestone: Milestone = { id: '1', name: 'Product Launch', date: '2027-05-15', type: 'event' };
      expect(formatMilestoneText(milestone, 0)).toBe('Product Launch is this week');
    });
  });
});

describe('findNextMilestone', () => {
  it('returns null for empty milestones array', () => {
    expect(findNextMilestone([], '2024-03-15')).toBeNull();
  });

  it('returns the closest future milestone', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ];
    const result = findNextMilestone(milestones, '2024-03-15');
    expect(result?.id).toBe('1');
  });

  it('skips past milestones', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ];
    const result = findNextMilestone(milestones, '2024-04-15');
    expect(result?.id).toBe('2');
  });

  it('returns null when all milestones are in the past', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
    ];
    expect(findNextMilestone(milestones, '2024-07-15')).toBeNull();
  });

  it('includes milestones where date equals today', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-15', type: 'period' },
    ];
    const result = findNextMilestone(milestones, '2024-03-15');
    expect(result?.id).toBe('1');
  });
});

describe('sortMilestonesByDate', () => {
  it('returns empty array for empty input', () => {
    expect(sortMilestonesByDate([])).toEqual([]);
  });

  it('sorts milestones by date ascending', () => {
    const milestones: Milestone[] = [
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      { id: '3', name: 'Q3', date: '2024-09-30', type: 'period' },
    ];
    const sorted = sortMilestonesByDate(milestones);
    expect(sorted.map(m => m.id)).toEqual(['1', '2', '3']);
  });

  it('does not mutate original array', () => {
    const milestones: Milestone[] = [
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
    ];
    sortMilestonesByDate(milestones);
    expect(milestones[0].id).toBe('2');
  });
});

describe('collectRelevantMilestones', () => {
  it('returns empty array when no milestones exist', () => {
    const result = collectRelevantMilestones({}, 2024, '2024-03-15');
    expect(result).toEqual([]);
  });

  it('returns milestones from selected year', () => {
    const yearlyMilestones: Record<string, Milestone[]> = {
      '2024': [
        { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
      ],
      '2025': [
        { id: '2', name: 'Q1', date: '2025-03-31', type: 'period' },
      ],
    };
    const result = collectRelevantMilestones(yearlyMilestones, 2024, '2024-03-15');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  it('includes future-year milestones within 6 months if configured in selected year', () => {
    const yearlyMilestones: Record<string, Milestone[]> = {
      '2024': [
        { id: '1', name: 'Q4', date: '2024-12-31', type: 'period' },
        { id: '2', name: 'FY25 Q1', date: '2025-01-31', type: 'period' },
      ],
    };
    const result = collectRelevantMilestones(yearlyMilestones, 2024, '2024-11-15');
    expect(result.length).toBe(2);
    expect(result.map(m => m.id)).toContain('1');
    expect(result.map(m => m.id)).toContain('2');
  });

  it('excludes past milestones', () => {
    const yearlyMilestones: Record<string, Milestone[]> = {
      '2024': [
        { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
        { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
      ],
    };
    const result = collectRelevantMilestones(yearlyMilestones, 2024, '2024-05-15');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('includes milestones where date equals today', () => {
    const yearlyMilestones: Record<string, Milestone[]> = {
      '2024': [
        { id: '1', name: 'Q1', date: '2024-03-15', type: 'period' },
      ],
    };
    const result = collectRelevantMilestones(yearlyMilestones, 2024, '2024-03-15');
    expect(result.length).toBe(1);
  });
});

describe('getNextMilestoneDisplay', () => {
  it('returns null for empty milestones array', () => {
    expect(getNextMilestoneDisplay([], '2024-03-15')).toBeNull();
  });

  it('returns correct display for period type', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'FY27 Q1', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-15');
    expect(result).toEqual({
      milestone: milestones[0],
      weeksRemaining: 3,
      text: '3 weeks left in FY27 Q1',
    });
  });

  it('returns correct display for event type', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Product Launch', date: '2024-04-01', type: 'event' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-15');
    expect(result).toEqual({
      milestone: milestones[0],
      weeksRemaining: 3,
      text: '3 weeks until Product Launch',
    });
  });


  it('prioritizes an active milestone with startDate over an earlier upcoming milestone', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Upcoming Event', date: '2024-03-20', type: 'event' },
      { id: '2', name: 'Current Quarter', startDate: '2024-03-01', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-16');
    expect(result?.milestone.id).toBe('2');
    expect(result?.progress?.percentage).toBe(52);
  });

  it('selects the nearest future milestone from unsorted input', () => {
    const milestones: Milestone[] = [
      { id: '2', name: 'Q2', date: '2024-06-30', type: 'period' },
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-15');
    expect(result?.milestone.id).toBe('1');
  });

  it('returns null when all milestones are past', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
    ];
    expect(getNextMilestoneDisplay(milestones, '2024-04-15')).toBeNull();
  });

  it('includes progress when milestone has an active startDate', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', startDate: '2024-03-01', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-16');
    expect(result?.progress).toEqual({
      percentage: 52,
      elapsedDays: 16,
      totalDays: 31,
    });
  });

  it('does not include progress when milestone has no startDate', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-16');
    expect(result?.progress).toBeUndefined();
  });

  it('does not include progress when today is outside start and end date range', () => {
    const milestones: Milestone[] = [
      { id: '1', name: 'Q1', startDate: '2024-03-20', date: '2024-03-31', type: 'period' },
    ];
    const result = getNextMilestoneDisplay(milestones, '2024-03-16');
    expect(result?.progress).toBeUndefined();
  });
});
