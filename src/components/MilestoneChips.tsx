import React from 'react';
import type { Milestone } from '../types/firestore';
import { sortMilestonesByDate } from '../services/milestone/MilestoneService';

type MilestoneChipsProps = {
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
};

export const MilestoneChips: React.FC<MilestoneChipsProps> = ({ milestones, onEdit, onDelete }) => {
  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, milestone: Milestone) => {
    event.stopPropagation();

    const confirmed = window.confirm(`Delete milestone "${milestone.name}"?`);
    if (!confirmed) {
      return;
    }

    onDelete(milestone.id);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {sortMilestonesByDate(milestones).map((milestone) => (
        <div
          key={milestone.id}
          role="button"
          tabIndex={0}
          onClick={() => onEdit(milestone)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEdit(milestone);
            }
          }}
          className="group flex items-center gap-2 px-3 py-2 bg-white/80 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors cursor-pointer"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">{milestone.name}</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
            onClick={(event) => handleDelete(event, milestone)}
            className="hidden sm:inline-flex ml-1 p-1 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
            title="Delete milestone"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
