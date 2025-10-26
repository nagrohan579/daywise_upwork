import ct from 'countries-and-timezones';

/**
 * Detects the user's timezone and country using browser APIs
 * @returns {Object} { timezone: string, country: string }
 */
export const detectUserLocation = () => {
  try {
    // Detect timezone using browser's Intl API (IANA timezone)
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Derive country from timezone using countries-and-timezones library
    let country = 'US'; // Default fallback
    let canonicalTimezone = browserTimezone;

    // Get timezone info - this normalizes legacy names like "Asia/Calcutta" to "Asia/Kolkata"
    const timezoneInfo = ct.getTimezone(browserTimezone);

    if (timezoneInfo) {
      // Use the canonical timezone name from the library
      canonicalTimezone = timezoneInfo.name;

      if (timezoneInfo.countries && timezoneInfo.countries.length > 0) {
        // Use the first (primary) country for this timezone
        country = timezoneInfo.countries[0];
      }
    }

    console.log(`Detected location - Browser: ${browserTimezone}, Canonical: ${canonicalTimezone}, Country: ${country}`);

    return {
      timezone: canonicalTimezone || 'UTC',
      country: country || 'US'
    };
  } catch (error) {
    console.error('Error detecting user location:', error);
    // Return safe defaults if detection fails
    return {
      timezone: 'UTC',
      country: 'US'
    };
  }
};
