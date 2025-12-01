import type { DailyEntry } from '../services/balance/BalanceService';
import type { WorkSchedule } from '../services/schedule/ScheduleService';
import type { VacationSettings } from '../services/vacation/VacationService';

export interface CustomPTOType {
  id: string;
  name: string;
  color: string;
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
  };
  createdAt: string;
}

export type FirestoreDailyEntry = Omit<DailyEntry, 'uid'> & {
  uid: string; // Ensure uid is present
  updatedAt: string;
};
