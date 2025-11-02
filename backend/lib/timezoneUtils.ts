import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Convert a time from a source timezone to UTC
 */
export const toUTC = (time: string, date: Date | string, sourceTz: string) => {
  const dateStr = typeof date === 'string' 
    ? date 
    : dayjs(date).format('YYYY-MM-DD');
  
  return dayjs.tz(`${dateStr} ${time}`, sourceTz).utc();
};

/**
 * Convert UTC time to local timezone
 */
export const toLocal = (utcTime: dayjs.Dayjs | Date | string, targetTz: string) => {
  return dayjs.utc(utcTime).tz(targetTz);
};

/**
 * Get the day of week for a date in a specific timezone
 */
export const getDayOfWeek = (date: Date | string, tz: string): number => {
  return dayjs.tz(date, tz).day();
};

/**
 * Get the date string for a date in a specific timezone
 */
export const getDateInTimezone = (date: Date | string, tz: string): string => {
  return dayjs.tz(date, tz).format('YYYY-MM-DD');
};

/**
 * Convert a date from customer's timezone to UTC for fetching availability
 */
export const customerDateToUTC = (date: string, customerTz: string, ownerTz: string) => {
  // Parse the date as if it's in the customer's timezone
  const dateInCustomerTz = dayjs.tz(date, customerTz);

  // Convert to UTC
  const utcDate = dateInCustomerTz.utc();

  // Get the same UTC date in the owner's timezone to find the corresponding day
  const dateInOwnerTz = utcDate.tz(ownerTz);

  return {
    utc: utcDate,
    ownerTz: dateInOwnerTz,
    dayOfWeek: dateInOwnerTz.day()
  };
};

/**
 * Format date for email display in a specific timezone
 * @param utcDate - UTC date/time (Date object, string, or dayjs object)
 * @param timezone - Target timezone (e.g., 'America/New_York', 'Asia/Kolkata')
 * @returns Formatted date string (e.g., "November 2, 2025")
 */
export const formatDateForEmail = (utcDate: Date | string | dayjs.Dayjs, timezone: string): string => {
  if (!timezone) timezone = 'Etc/UTC';
  return dayjs.utc(utcDate).tz(timezone).format('MMMM D, YYYY');
};

/**
 * Format time for email display in a specific timezone
 * @param utcDate - UTC date/time (Date object, string, or dayjs object)
 * @param timezone - Target timezone (e.g., 'America/New_York', 'Asia/Kolkata')
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatTimeForEmail = (utcDate: Date | string | dayjs.Dayjs, timezone: string): string => {
  if (!timezone) timezone = 'Etc/UTC';
  return dayjs.utc(utcDate).tz(timezone).format('h:mm A');
};

/**
 * Format date and time for email display in a specific timezone
 * @param utcDate - UTC date/time (Date object, string, or dayjs object)
 * @param timezone - Target timezone (e.g., 'America/New_York', 'Asia/Kolkata')
 * @returns Object with separate date and time strings
 */
export const formatDateTimeForEmail = (utcDate: Date | string | dayjs.Dayjs, timezone: string): { date: string, time: string } => {
  if (!timezone) timezone = 'Etc/UTC';
  const dt = dayjs.utc(utcDate).tz(timezone);
  return {
    date: dt.format('MMMM D, YYYY'),
    time: dt.format('h:mm A')
  };
};

