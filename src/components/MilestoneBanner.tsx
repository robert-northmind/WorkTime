import React from 'react';
import type { MilestoneDisplay } from '../services/milestone/MilestoneService';

interface MilestoneBannerProps {
  display: MilestoneDisplay;
}

export const MilestoneBanner: React.FC<MilestoneBannerProps> = ({ display }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {display.text}
          </p>
          <p className="text-xs text-gray-600">
            {new Date(display.milestone.date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full border border-amber-200">
          <span className="text-2xl font-bold text-amber-600">
            {display.weeksRemaining}
          </span>
          <span className="text-xs font-medium text-gray-600 uppercase">
            {display.weeksRemaining === 1 ? 'week' : 'weeks'}
          </span>
        </div>
      </div>
    </div>
  );
};
