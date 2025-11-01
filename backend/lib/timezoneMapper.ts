import { TIMEZONES } from '../timezones';

/**
 * Map any timezone to one of the 20 supported timezones
 * This handles legacy timezone values in the database
 */
export function mapToSupportedTimezone(timezone: string | undefined | null): string {
  if (!timezone) return 'Etc/UTC';

  // Direct match - timezone is already supported
  if (TIMEZONES.includes(timezone)) {
    return timezone;
  }

  // Mapping for common timezone aliases and related timezones
  const timezoneMap: Record<string, string> = {
    // US Pacific zones
    'America/Tijuana': 'America/Los_Angeles',
    'America/Vancouver': 'America/Los_Angeles',
    'US/Pacific': 'America/Los_Angeles',
    'PST8PDT': 'America/Los_Angeles',

    // US Mountain zones
    'America/Phoenix': 'America/Denver',
    'America/Boise': 'America/Denver',
    'America/Edmonton': 'America/Denver',
    'US/Mountain': 'America/Denver',
    'MST7MDT': 'America/Denver',

    // US Central zones
    'America/Mexico_City': 'America/Chicago',
    'America/Winnipeg': 'America/Chicago',
    'America/Regina': 'America/Chicago',
    'US/Central': 'America/Chicago',
    'CST6CDT': 'America/Chicago',

    // US Eastern zones
    'America/Toronto': 'America/New_York',
    'America/Montreal': 'America/New_York',
    'America/Detroit': 'America/New_York',
    'America/Indiana/Indianapolis': 'America/New_York',
    'US/Eastern': 'America/New_York',
    'EST5EDT': 'America/New_York',

    // Atlantic
    'America/Bermuda': 'America/Halifax',
    'America/Thule': 'America/Halifax',

    // Alaska
    'America/Juneau': 'America/Anchorage',
    'America/Nome': 'America/Anchorage',
    'America/Yakutat': 'America/Anchorage',
    'US/Alaska': 'America/Anchorage',

    // Hawaii
    'Pacific/Johnston': 'Pacific/Honolulu',
    'US/Hawaii': 'Pacific/Honolulu',
    'HST': 'Pacific/Honolulu',

    // Europe/GMT
    'Europe/Dublin': 'Europe/London',
    'Europe/Guernsey': 'Europe/London',
    'Europe/Isle_of_Man': 'Europe/London',
    'Europe/Jersey': 'Europe/London',
    'GB': 'Europe/London',
    'GMT': 'Europe/London',

    // Western Europe
    'Europe/Porto': 'Europe/Lisbon',
    'Atlantic/Canary': 'Europe/Lisbon',
    'Atlantic/Madeira': 'Europe/Lisbon',
    'WET': 'Europe/Lisbon',

    // Central Europe
    'Europe/Paris': 'Europe/Berlin',
    'Europe/Rome': 'Europe/Berlin',
    'Europe/Amsterdam': 'Europe/Berlin',
    'Europe/Brussels': 'Europe/Berlin',
    'Europe/Copenhagen': 'Europe/Berlin',
    'Europe/Madrid': 'Europe/Berlin',
    'Europe/Oslo': 'Europe/Berlin',
    'Europe/Prague': 'Europe/Berlin',
    'Europe/Stockholm': 'Europe/Berlin',
    'Europe/Vienna': 'Europe/Berlin',
    'Europe/Warsaw': 'Europe/Berlin',
    'Europe/Zurich': 'Europe/Berlin',
    'CET': 'Europe/Berlin',

    // Eastern Europe
    'Europe/Helsinki': 'Europe/Athens',
    'Europe/Kiev': 'Europe/Athens',
    'Europe/Bucharest': 'Europe/Athens',
    'Europe/Sofia': 'Europe/Athens',
    'EET': 'Europe/Athens',

    // Gulf/Middle East
    'Asia/Muscat': 'Asia/Dubai',
    'Asia/Bahrain': 'Asia/Dubai',
    'Asia/Qatar': 'Asia/Dubai',
    'Asia/Riyadh': 'Asia/Dubai',

    // India - LEGACY TIMEZONE MAPPING
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Kolkata': 'Asia/Kolkata', // This will be mapped below to supported IST

    // China
    'Asia/Hong_Kong': 'Asia/Shanghai',
    'Asia/Macau': 'Asia/Shanghai',
    'Asia/Taipei': 'Asia/Shanghai',
    'PRC': 'Asia/Shanghai',

    // Southeast Asia
    'Asia/Kuala_Lumpur': 'Asia/Singapore',
    'Asia/Jakarta': 'Asia/Singapore',
    'Asia/Bangkok': 'Asia/Singapore',

    // Japan
    'Asia/Osaka': 'Asia/Tokyo',
    'Japan': 'Asia/Tokyo',
    'JST': 'Asia/Tokyo',

    // Australia
    'Australia/Melbourne': 'Australia/Sydney',
    'Australia/Brisbane': 'Australia/Sydney',
    'Australia/Canberra': 'Australia/Sydney',

    // New Zealand
    'Pacific/Chatham': 'Pacific/Auckland',
    'NZ': 'Pacific/Auckland',

    // South America
    'America/Argentina/Buenos_Aires': 'America/Sao_Paulo',
    'America/Santiago': 'America/Sao_Paulo',
    'America/Montevideo': 'America/Sao_Paulo',

    // UTC
    'UTC': 'Etc/UTC',
    'Etc/GMT': 'Etc/UTC',
  };

  // Check mapping
  if (timezoneMap[timezone]) {
    const mapped = timezoneMap[timezone];
    // If mapped timezone is in supported list, return it
    if (TIMEZONES.includes(mapped)) {
      return mapped;
    }
  }

  // India special case: Asia/Kolkata is NOT in our 20 timezones
  // Our 20 timezones use Asia/Kolkata for IST, so this should work
  // But let me check - according to our TIMEZONES list, we should have Asia/Kolkata
  // Wait, looking at the TIMEZONES I just wrote, I have Asia/Kolkata
  // Let me check the error - it says Asia/Kolkata
  // Ah! The issue is that Asia/Kolkata IS in the 20 timezones I just set
  // But the user wants IST to be represented differently

  // Actually, looking back at frontend timezones.js:
  // { label: 'India Standard Time (IST)', value: 'Asia/Kolkata' }
  // So Asia/Kolkata IS the supported timezone for IST

  // If we reach here and haven't found a match, default to UTC
  console.warn(`Timezone ${timezone} not in supported list, defaulting to UTC`);
  return 'Etc/UTC';
}
