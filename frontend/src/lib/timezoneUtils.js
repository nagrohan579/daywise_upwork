import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Convert a time from a source timezone to UTC
 * @param {string} time - Time string in format "HH:MM" (e.g., "09:00")
 * @param {string|Date} date - Date object or string in the source timezone
 * @param {string} sourceTz - Source timezone (e.g., "Asia/Calcutta")
 * @returns {dayjs.Dayjs} - UTC dayjs object
 */
export const toUTC = (time, date, sourceTz) => {
  const timeStr = typeof time === 'string' ? time : time.format('HH:mm');
  const dateStr = typeof date === 'string' 
    ? date 
    : dayjs(date).format('YYYY-MM-DD');
  
  return dayjs.tz(`${dateStr} ${timeStr}`, sourceTz).utc();
};

/**
 * Convert UTC time to local timezone
 * @param {dayjs.Dayjs|Date|string} utcTime - UTC time
 * @param {string} targetTz - Target timezone (e.g., "America/New_York")
 * @returns {dayjs.Dayjs} - dayjs object in target timezone
 */
export const toLocal = (utcTime, targetTz) => {
  return dayjs.utc(utcTime).tz(targetTz);
};

/**
 * Convert a time string from source timezone to target timezone
 * @param {string} time - Time string (e.g., "09:00 AM")
 * @param {Date} date - Date in source timezone
 * @param {string} sourceTz - Source timezone
 * @param {string} targetTz - Target timezone
 * @returns {string} - Time string in target timezone (e.g., "09:00 AM")
 */
export const convertTime = (time, date, sourceTz, targetTz) => {
  // Parse time string (e.g., "09:00 AM" or "9:00 AM")
  const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!timeMatch) {
    console.error('Invalid time format:', time);
    return time;
  }

  let hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  const period = timeMatch[3];

  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const dateStr = dayjs(date).format('YYYY-MM-DD');
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  // Convert from source timezone to target timezone
  const utc = dayjs.tz(`${dateStr} ${timeStr}`, sourceTz).utc();
  const local = utc.tz(targetTz);

  return local.format('h:mm A');
};

/**
 * Get the day of week for a date in a specific timezone
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (e.g., "Asia/Calcutta")
 * @returns {number} - Day of week (0-6, where 0 is Sunday)
 */
export const getDayOfWeek = (date, timezone) => {
  return dayjs.tz(date, timezone).day();
};

/**
 * Get the date string for a date in a specific timezone
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (e.g., "Asia/Calcutta")
 * @returns {string} - Date string in format "YYYY-MM-DD"
 */
export const getDateInTimezone = (date, timezone) => {
  return dayjs.tz(date, timezone).format('YYYY-MM-DD');
};

/**
 * Detect user's timezone
 * @returns {string} - Timezone identifier (e.g., "America/New_York")
 */
export const detectTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Generate time slots between startTime and endTime, respecting buffer times
 * @param {string} startTime - Start time (e.g., "09:00")
 * @param {string} endTime - End time (e.g., "17:00")
 * @param {number} duration - Appointment duration in minutes
 * @param {number} bufferBefore - Buffer before in minutes
 * @param {number} bufferAfter - Buffer after in minutes
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} timezone - Timezone for conversion
 * @returns {string[]} - Array of time slot strings (e.g., ["09:00 AM", "10:10 AM"])
 */
export const generateTimeSlots = (startTime, endTime, duration, bufferBefore, bufferAfter, date, timezone) => {
  const slots = [];
  
  // Parse start and end times
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const totalSlotTime = duration + bufferBefore + bufferAfter;

  // Generate slots
  for (let time = startMinutes; time + totalSlotTime <= endMinutes; time += totalSlotTime) {
    const hours = Math.floor(time / 60);
    const mins = time % 60;
    
    // Convert to the target timezone
    const dateStr = typeof date === 'string' ? date : dayjs(date).format('YYYY-MM-DD');
    const utc = dayjs.tz(`${dateStr} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`, timezone).utc();
    
    slots.push(utc.format('h:mm A'));
  }

  return slots;
};

/**
 * Check if a time slot overlaps with unavailable time
 * @param {dayjs.Dayjs} slotStart - Slot start time in UTC
 * @param {dayjs.Dayjs} slotEnd - Slot end time in UTC
 * @param {string} unavailStart - Unavailable start time (HH:MM)
 * @param {string} unavailEnd - Unavailable end time (HH:MM)
 * @param {string} unavailDate - Unavailable date (YYYY-MM-DD)
 * @param {string} unavailTz - Unavailable timezone
 * @returns {boolean} - True if there's an overlap
 */
export const isSlotUnavailable = (slotStart, slotEnd, unavailStart, unavailEnd, unavailDate, unavailTz) => {
  const unavailStartUTC = toUTC(unavailStart, unavailDate, unavailTz);
  const unavailEndUTC = toUTC(unavailEnd, unavailDate, unavailTz);
  
  // Check if slot overlaps with unavailable time
  return slotStart.isBefore(unavailEndUTC) && slotEnd.isAfter(unavailStartUTC);
};

