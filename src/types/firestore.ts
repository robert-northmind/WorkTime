import type { DailyEntry } from '../services/balance/BalanceService';
import type { WorkSchedule } from '../services/schedule/ScheduleService';
import type { VacationSettings } from '../services/vacation/VacationService';

export interface CustomPTOType {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  date: string;              // YYYY-MM-DD
  startDate?: string;        // YYYY-MM-DD (optional)
  type: 'period' | 'event';
}

export interface UserDocument {
  uid: string;
  email: string;
  settings: {
    schedules: WorkSchedule[];
    vacation: VacationSettings;
    trackingStartDate?: string; // YYYY-MM-DD
    yearlyComments?: Record<string, string>; // Year -> Comment
    customPTO?: CustomPTOType[];
    ptoColors?: Record<string, string>; // type -> color
    timeFormat?: '12h' | '24h'; // Time display format (default: '24h')
    yearlyMilestones?: Record<string, Milestone[]>; // year -> milestones
  };
  createdAt: string;
}

export type FirestoreDailyEntry = Omit<DailyEntry, 'uid'> & {
  uid: string; // Ensure uid is present
  updatedAt: string;
};
