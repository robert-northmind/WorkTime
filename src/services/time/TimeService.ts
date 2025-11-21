/**
 * Converts HH:MM string to minutes from midnight.
 * Returns 0 if invalid.
 */
export const timeToMinutes = (time: string): number => {
  if (!time || typeof time !== 'string') return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

/**
 * Converts minutes from midnight to HH:MM string.
 */
export const minutesToTime = (minutes: number): string => {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Calculates duration in minutes between start and end time (HH:MM).
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
};

/**
 * Formats minutes as hours:minutes (e.g., 90 -> "1:30", -45 -> "-0:45").
 */
export const formatHours = (minutes: number): string => {
  const isNegative = minutes < 0;
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = Math.floor(absMinutes % 60);
  
  return `${isNegative ? '-' : ''}${hours}:${mins.toString().padStart(2, '0')}`;
};
