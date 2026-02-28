import type { Milestone } from '../../types/firestore';

export type MilestoneDraft = Omit<Milestone, 'id'>;

export function normalizeStartDate(startDate?: string): string | undefined {
  return startDate || undefined;
}

export function createMilestoneFromDraft(draft: MilestoneDraft, id: string): Milestone {
  return {
    ...draft,
    id,
    name: draft.name.trim(),
    startDate: normalizeStartDate(draft.startDate),
  };
}

export function toEditableMilestone(milestone: Milestone): Milestone {
  return {
    ...milestone,
    startDate: milestone.startDate || '',
  };
}

export function updateMilestoneInList(milestones: Milestone[], updated: Milestone): Milestone[] {
  return milestones.map((milestone) =>
    milestone.id === updated.id
      ? {
          ...updated,
          name: updated.name.trim(),
          startDate: normalizeStartDate(updated.startDate),
        }
      : milestone
  );
}

export function removeMilestoneFromList(milestones: Milestone[], milestoneId: string): Milestone[] {
  return milestones.filter((milestone) => milestone.id !== milestoneId);
}
