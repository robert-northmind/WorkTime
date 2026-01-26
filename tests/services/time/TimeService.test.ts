import {
  timeToMinutes,
  minutesToTime,
  calculateDuration,
  formatHours,
  isToday
} from '../../../src/services/time/TimeService';

describe('TimeService', () => {
  describe('timeToMinutes', () => {
    it('converts HH:MM to minutes', () => {
      expect(timeToMinutes('01:30')).toBe(90);
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('12:00')).toBe(720);
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('handles invalid inputs gracefully', () => {
      expect(timeToMinutes('')).toBe(0);
      expect(timeToMinutes(null as unknown as string)).toBe(0);
    });
  });

  describe('minutesToTime', () => {
    it('converts minutes to HH:MM', () => {
      expect(minutesToTime(90)).toBe('01:30');
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(720)).toBe('12:00');
    });

    it('pads single digits', () => {
      expect(minutesToTime(5)).toBe('00:05');
      expect(minutesToTime(65)).toBe('01:05');
    });
  });

  describe('calculateDuration', () => {
    it('calculates difference between start and end times in minutes', () => {
      expect(calculateDuration('09:00', '17:00')).toBe(480); // 8 hours
      expect(calculateDuration('09:00', '09:30')).toBe(30);
    });

    it('handles end time before start time (assuming same day error or 0)', () => {
      // Assumption: User doesn't work overnight as per requirements
      expect(calculateDuration('17:00', '09:00')).toBeLessThanOrEqual(0);
    });
  });

  describe('formatHours', () => {
    it('formats minutes as hours:minutes', () => {
      expect(formatHours(90)).toBe('1:30');
      expect(formatHours(60)).toBe('1:00');
      expect(formatHours(30)).toBe('0:30');
    });

    it('handles negative values', () => {
      expect(formatHours(-45)).toBe('-0:45');
      expect(formatHours(-90)).toBe('-1:30');
    });
  });

  describe('isToday', () => {
    it('returns true when date matches reference date', () => {
      const referenceDate = new Date('2024-06-15T10:30:00');
      expect(isToday('2024-06-15', referenceDate)).toBe(true);
    });

    it('returns false when date does not match reference date', () => {
      const referenceDate = new Date('2024-06-15T10:30:00');
      expect(isToday('2024-06-14', referenceDate)).toBe(false);
      expect(isToday('2024-06-16', referenceDate)).toBe(false);
      expect(isToday('2023-06-15', referenceDate)).toBe(false);
    });

    it('handles empty or invalid date strings', () => {
      const referenceDate = new Date('2024-06-15T10:30:00');
      expect(isToday('', referenceDate)).toBe(false);
      expect(isToday('invalid', referenceDate)).toBe(false);
    });

    it('uses current date when no reference date provided', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;

      expect(isToday(todayString)).toBe(true);
    });
  });
});
