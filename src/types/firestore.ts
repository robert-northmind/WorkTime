import type { DailyEntry } from '../services/balance/BalanceService';
import type { WorkSchedule } from '../services/schedule/ScheduleService';
import type { VacationSettings } from '../services/vacation/VacationService';

export interface UserDocument {
  uid: string;
  email: string;
  settings: {
    schedules: WorkSchedule[];
    vacation: VacationSettings;
    trackingStartDate?: string; // YYYY-MM-DD
  };
  createdAt: string;
}

export type FirestoreDailyEntry = Omit<DailyEntry, 'uid'> & {
  uid: string; // Ensure uid is present
  updatedAt: string;
};
