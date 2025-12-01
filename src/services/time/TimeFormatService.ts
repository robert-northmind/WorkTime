/**
 * Service for handling time format conversions between 12h and 24h formats
 */

export type TimeFormat = '12h' | '24h';

/**
 * Formats a time string (HH:mm) for display according to the specified format
 * @param time - Time in HH:mm format (24-hour)
 * @param format - Desired output format ('12h' or '24h')
 * @returns Formatted time string
 */
export function formatTimeDisplay(time: string | null | undefined, format: TimeFormat = '24h'): string {
  if (!time || time === '') {
    return '--:--';
  }

  // If already in 24h format and that's what we want, return as-is
  if (format === '24h') {
    return time;
  }

  // Convert to 12h format
  const [hoursStr, minutes] = time.split(':');
  const hours = parseInt(hoursStr, 10);

  if (isNaN(hours) || hours < 0 || hours > 23) {
    return '--:--';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hours12}:${minutes} ${period}`;
}

/**
 * Normalizes time input to HH:mm format (24-hour)
 * Handles both 12h and 24h input formats
 * @param time - Time string in various formats
 * @returns Time in HH:mm format (24-hour)
 */
export function parseTimeInput(time: string): string {
  if (!time || time.trim() === '') {
    return '';
  }

  // If it's already in HH:mm format (no AM/PM), return as-is
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }

  // Parse 12h format (e.g., "1:30 PM" or "12:00 AM")
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  return time;
}

/**
 * Gets the value to use for time input elements
 * Returns undefined for null/undefined/empty to ensure proper placeholder display in Safari
 * Safari requires the value attribute to be absent (undefined) rather than empty string
 * @param time - Time value (may be null or undefined)
 * @returns Time string or undefined
 */
export function getTimeInputValue(time: string | null | undefined): string | undefined {
  if (!time || time === '') {
    return '';
  }
  return time;
}
