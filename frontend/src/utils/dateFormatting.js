import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Format a date/time in the user's timezone
 * @param {string|Date} dateValue - Date to format (UTC timestamp from backend)
 * @param {string} userTimezone - User's timezone (e.g., 'America/New_York')
 * @param {string} format - dayjs format string
 * @returns {string} - Formatted date string in user's timezone
 */
export const formatInTimezone = (dateValue, userTimezone, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!dateValue) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  return dayjs.utc(dateValue).tz(userTimezone).format(format);
};

/**
 * Format date and time for display (e.g., "November 20, 2025 at 12:30 PM")
 * @param {string|Date} timestamp - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @returns {string} - Formatted string
 */
export const formatDateTime = (timestamp, userTimezone) => {
  if (!timestamp) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  const dateStr = dayjs.utc(timestamp).tz(userTimezone).format('MMMM D, YYYY');
  const timeStr = dayjs.utc(timestamp).tz(userTimezone).format('h:mm A');
  return `${dateStr} at ${timeStr}`;
};

/**
 * Format relative timestamp (e.g., "Today, 12:30 pm" or "Yesterday, 3:45 pm")
 * @param {string|Date} createdAt - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @returns {string} - Formatted relative time string
 */
export const formatTimestamp = (createdAt, userTimezone) => {
  if (!createdAt) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  const now = dayjs().tz(userTimezone);
  const created = dayjs.utc(createdAt).tz(userTimezone);
  const diffMins = now.diff(created, 'minute');
  const diffHours = now.diff(created, 'hour');
  const diffDays = now.diff(created, 'day');

  const timeStr = created.format('h:mm A').toLowerCase();

  if (diffMins < 60) {
    return `Today, ${timeStr}`;
  } else if (diffHours < 24) {
    return `Today, ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  } else if (diffDays < 7) {
    const dayName = created.format('dddd');
    return `${dayName}, ${timeStr}`;
  } else {
    const dateStr = created.format('ddd, MMMM D, YYYY');
    return `${dateStr}, ${timeStr}`;
  }
};

/**
 * Format date for display (e.g., "November 20, 2025")
 * @param {string|Date} dateValue - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateValue, userTimezone) => {
  if (!dateValue) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  return dayjs.utc(dateValue).tz(userTimezone).format('MMMM DD, YYYY');
};

/**
 * Format time for display (e.g., "2:30pm" or "14:00")
 * @param {string|Date} dateValue - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @param {boolean} use24Hour - Use 24-hour format (default: false)
 * @returns {string} - Formatted time string
 */
export const formatTime = (dateValue, userTimezone, use24Hour = false) => {
  if (!dateValue) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  const format = use24Hour ? 'HH:mm' : 'h:mma';
  return dayjs.utc(dateValue).tz(userTimezone).format(format).toLowerCase();
};

/**
 * Get hours and minutes in user's timezone
 * @param {string|Date} dateValue - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @returns {{hours: number, minutes: number}} - Hour and minute values in user's timezone
 */
export const getTimeComponents = (dateValue, userTimezone) => {
  if (!dateValue) return { hours: 0, minutes: 0 };
  if (!userTimezone) userTimezone = 'Etc/UTC';

  const dt = dayjs.utc(dateValue).tz(userTimezone);
  return {
    hours: dt.hour(),
    minutes: dt.minute()
  };
};

/**
 * Format date for local date string (YYYY-MM-DD format)
 * @param {string|Date} dateValue - UTC timestamp
 * @param {string} userTimezone - User's timezone
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const toLocalDateString = (dateValue, userTimezone) => {
  if (!dateValue) return '';
  if (!userTimezone) userTimezone = 'Etc/UTC';

  return dayjs.utc(dateValue).tz(userTimezone).format('YYYY-MM-DD');
};
