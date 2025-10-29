import ct from 'countries-and-timezones';

/**
 * Supported timezones - Limited list of 20 common timezones
 */
export const SUPPORTED_TIMEZONES = [
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Atlantic Time (AT)', value: 'America/Halifax' },
  { label: 'Alaska Time (AKST)', value: 'America/Anchorage' },
  { label: 'Hawaii Time (HST)', value: 'Pacific/Honolulu' },
  { label: 'Greenwich Mean Time (GMT)', value: 'Europe/London' },
  { label: 'Western European Time (WET)', value: 'Europe/Lisbon' },
  { label: 'Central European Time (CET)', value: 'Europe/Berlin' },
  { label: 'Eastern European Time (EET)', value: 'Europe/Athens' },
  { label: 'Gulf Standard Time (GST)', value: 'Asia/Dubai' },
  { label: 'India Standard Time (IST)', value: 'Asia/Kolkata' },
  { label: 'China Standard Time (CST)', value: 'Asia/Shanghai' },
  { label: 'Singapore Standard Time (SGT)', value: 'Asia/Singapore' },
  { label: 'Japan Standard Time (JST)', value: 'Asia/Tokyo' },
  { label: 'Australian Eastern Time (AET)', value: 'Australia/Sydney' },
  { label: 'New Zealand Standard Time (NZST)', value: 'Pacific/Auckland' },
  { label: 'Brasília Time (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Coordinated Universal Time (UTC)', value: 'Etc/UTC' },
];

/**
 * Get timezone options for dropdown with UTC offset
 */
export const getTimezoneOptions = () => {
  const allTimezones = ct.getAllTimezones();

  return SUPPORTED_TIMEZONES.map(tz => {
    const tzInfo = allTimezones[tz.value];
    if (tzInfo) {
      const offset = tzInfo.utcOffset / 60; // Convert minutes to hours
      const sign = offset >= 0 ? '+' : '';
      const formattedOffset = `GMT${sign}${offset}`;
      return [tz.label + ` (${formattedOffset})`, tz.value];
    }
    return [tz.label, tz.value];
  });
};

/**
 * Get formatted timezone label for display
 * @param {string} value - Timezone value (e.g., "America/Los_Angeles")
 * @returns {string} - Formatted label (e.g., "Pacific Time (PT) (GMT-8)")
 */
export const getTimezoneLabel = (value) => {
  if (!value) return 'Coordinated Universal Time (UTC) (GMT+0)';

  const allTimezones = ct.getAllTimezones();
  const supported = SUPPORTED_TIMEZONES.find(tz => tz.value === value);
  const tzInfo = allTimezones[value];

  if (supported && tzInfo) {
    const offset = tzInfo.utcOffset / 60;
    const sign = offset >= 0 ? '+' : '';
    const formattedOffset = `GMT${sign}${offset}`;
    return `${supported.label} (${formattedOffset})`;
  }

  // Fallback for unsupported timezones
  if (tzInfo) {
    const offset = tzInfo.utcOffset / 60;
    const sign = offset >= 0 ? '+' : '';
    const formattedOffset = `GMT${sign}${offset}`;
    const displayName = value.replace(/_/g, ' ');
    return `${displayName} (${formattedOffset})`;
  }

  return value.replace(/_/g, ' ');
};

/**
 * Get timezone value from formatted label
 * @param {string} label - Formatted label (e.g., "Pacific Time (PT) (GMT-8)")
 * @returns {string} - Timezone value (e.g., "America/Los_Angeles")
 */
export const getTimezoneValue = (label) => {
  if (!label) return 'Etc/UTC';

  // Try to find by matching the label prefix
  const supported = SUPPORTED_TIMEZONES.find(tz => label.startsWith(tz.label));
  if (supported) {
    return supported.value;
  }

  // Fallback: try to extract timezone name from label
  const match = label.match(/^(.+?)\s*\(GMT[+-]\d+\)$/);
  if (match) {
    const tzName = match[1].trim().replace(/ /g, '_');
    const found = SUPPORTED_TIMEZONES.find(tz => tz.value.includes(tzName));
    if (found) return found.value;
  }

  return 'Etc/UTC';
};

/**
 * Map a detected timezone to the closest supported timezone
 * @param {string} detectedTimezone - Browser-detected timezone (e.g., "America/Los_Angeles")
 * @returns {string} - Closest supported timezone value
 */
export const mapToSupportedTimezone = (detectedTimezone) => {
  if (!detectedTimezone) return 'Etc/UTC';

  // Direct match
  const directMatch = SUPPORTED_TIMEZONES.find(tz => tz.value === detectedTimezone);
  if (directMatch) return directMatch.value;

  // Try to get timezone info from ct library (handles legacy names like Asia/Calcutta)
  const tzInfo = ct.getTimezone(detectedTimezone);
  if (tzInfo) {
    const canonicalMatch = SUPPORTED_TIMEZONES.find(tz => tz.value === tzInfo.name);
    if (canonicalMatch) return canonicalMatch.value;
  }

  // Mapping for common timezone aliases and related timezones
  const timezoneMap = {
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

    // India
    'Asia/Calcutta': 'Asia/Kolkata',
    'IST': 'Asia/Kolkata',

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
    'GMT': 'Etc/UTC',
    'Etc/GMT': 'Etc/UTC',
  };

  // Check mapping
  if (timezoneMap[detectedTimezone]) {
    return timezoneMap[detectedTimezone];
  }

  // If no match found, try to match by UTC offset
  if (tzInfo) {
    const allTimezones = ct.getAllTimezones();
    const detectedOffset = tzInfo.utcOffset;

    // Find the first supported timezone with the same offset
    for (const supportedTz of SUPPORTED_TIMEZONES) {
      const supportedTzInfo = allTimezones[supportedTz.value];
      if (supportedTzInfo && supportedTzInfo.utcOffset === detectedOffset) {
        return supportedTz.value;
      }
    }
  }

  // Default fallback
  return 'Etc/UTC';
};
