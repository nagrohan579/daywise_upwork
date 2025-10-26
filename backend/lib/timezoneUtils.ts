import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

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

