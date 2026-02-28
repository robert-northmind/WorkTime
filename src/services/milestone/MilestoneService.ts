export interface Milestone {
  id: string;
  name: string;
  date: string;              // YYYY-MM-DD
  startDate?: string;        // YYYY-MM-DD (optional)
  type: 'period' | 'event';
}

export interface MilestoneProgress {
  percentage: number;
  elapsedDays: number;
  totalDays: number;
}

export interface MilestoneDisplay {
  milestone: Milestone;
  weeksRemaining: number;
  text: string;
  progress?: MilestoneProgress;
}


function isMilestoneActive(milestone: Milestone, todayStr: string): boolean {
  if (!milestone.startDate) return false;

  const start = new Date(milestone.startDate + 'T00:00:00');
  const end = new Date(milestone.date + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');

  if (start > end) return false;
  return today >= start && today <= end;
}

function calculateMilestoneProgress(milestone: Milestone, todayStr: string): MilestoneProgress | undefined {
  if (!milestone.startDate) return undefined;

  const start = new Date(milestone.startDate + 'T00:00:00');
  const end = new Date(milestone.date + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');

  if (start > end || today < start || today > end) {
    return undefined;
  }

  const dayMs = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  const elapsedDays = Math.floor((today.getTime() - start.getTime()) / dayMs) + 1;
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    percentage,
    elapsedDays,
    totalDays,
  };
}

/**
 * Calculate the number of weeks until a target date.
 * Returns negative values for past dates.
 * Partial weeks count as 1 week (ceiling).
 */
export function calculateWeeksUntil(todayStr: string, targetDateStr: string): number {
  const today = new Date(todayStr + 'T00:00:00');
  const target = new Date(targetDateStr + 'T00:00:00');

  const diffMs = target.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 0;
  if (diffDays > 0) {
    return Math.ceil(diffDays / 7);
  }
  // For negative values (past dates), use floor to get proper negative weeks
  return Math.floor(diffDays / 7);
}

/**
 * Format display text for a milestone based on its type and weeks remaining.
 * - Period: "5 weeks left in FY27 Q1" / "1 week left in..." / "Final week of..."
 * - Event: "5 weeks until Product Launch" / "1 week until..." / "... is this week"
 */
export function formatMilestoneText(milestone: Milestone, weeksRemaining: number): string {
  const weekLabel = weeksRemaining === 1 ? 'week' : 'weeks';

  if (milestone.type === 'period') {
    if (weeksRemaining === 0) {
      return `Final week of ${milestone.name}`;
    }
    return `${weeksRemaining} ${weekLabel} left in ${milestone.name}`;
  } else {
    // Event type
    if (weeksRemaining === 0) {
      return `${milestone.name} is this week`;
    }
    return `${weeksRemaining} ${weekLabel} until ${milestone.name}`;
  }
}

/**
 * Find the next upcoming milestone from a list.
 * Returns null if no future milestones exist.
 * Includes milestones where date equals today.
 */
export function findNextMilestone(milestones: Milestone[], todayStr: string): Milestone | null {
  if (milestones.length === 0) return null;

  const today = new Date(todayStr + 'T00:00:00');

  // Filter to future milestones (including today)
  const futureMilestones = milestones.filter(m => {
    const milestoneDate = new Date(m.date + 'T00:00:00');
    return milestoneDate >= today;
  });

  if (futureMilestones.length === 0) return null;

  // Sort by date and return the closest one
  const sorted = sortMilestonesByDate(futureMilestones);
  return sorted[0];
}

/**
 * Sort milestones by date in ascending order.
 * Does not mutate the original array.
 */
export function sortMilestonesByDate(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Collect relevant milestones for display.
 * - Gets milestones from the selected year configuration
 * - Filters out past milestones
 * - Includes cross-year milestones if configured in selected year
 */
export function collectRelevantMilestones(
  yearlyMilestones: Record<string, Milestone[]>,
  selectedYear: number,
  todayStr: string
): Milestone[] {
  const yearMilestones = yearlyMilestones[selectedYear.toString()] || [];

  const today = new Date(todayStr + 'T00:00:00');

  // Filter to future milestones (including today)
  return yearMilestones.filter(m => {
    const milestoneDate = new Date(m.date + 'T00:00:00');
    return milestoneDate >= today;
  });
}

/**
 * Get the display information for the next upcoming milestone.
 * Returns null if no future milestones exist.
 */
export function getNextMilestoneDisplay(
  milestones: Milestone[],
  todayStr: string
): MilestoneDisplay | null {
  const activeMilestones = sortMilestonesByDate(
    milestones.filter(milestone => isMilestoneActive(milestone, todayStr))
  );

  const milestoneToDisplay = activeMilestones[0] || findNextMilestone(milestones, todayStr);

  if (!milestoneToDisplay) return null;

  const weeksRemaining = calculateWeeksUntil(todayStr, milestoneToDisplay.date);
  const text = formatMilestoneText(milestoneToDisplay, weeksRemaining);

  return {
    milestone: milestoneToDisplay,
    weeksRemaining,
    text,
    progress: calculateMilestoneProgress(milestoneToDisplay, todayStr),
  };
}
