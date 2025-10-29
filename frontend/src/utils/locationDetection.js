import ct from 'countries-and-timezones';
import { mapToSupportedTimezone } from './timezones';

/**
 * Detects the user's timezone and country using browser APIs
 * Maps detected timezone to one of the supported timezones
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

    // Map to supported timezone
    const supportedTimezone = mapToSupportedTimezone(canonicalTimezone);

    console.log(`Detected location - Browser: ${browserTimezone}, Canonical: ${canonicalTimezone}, Mapped: ${supportedTimezone}, Country: ${country}`);

    return {
      timezone: supportedTimezone,
      country: country || 'US'
    };
  } catch (error) {
    console.error('Error detecting user location:', error);
    // Return safe defaults if detection fails
    return {
      timezone: 'Etc/UTC',
      country: 'US'
    };
  }
};
