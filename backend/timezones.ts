// shared/timezones.ts
// Standardized list of 20 supported timezones (matches frontend)
export const TIMEZONES = [
  "America/Los_Angeles",    // Pacific Time (PT)
  "America/Denver",         // Mountain Time (MT)
  "America/Chicago",        // Central Time (CT)
  "America/New_York",       // Eastern Time (ET)
  "America/Halifax",        // Atlantic Time (AT)
  "America/Anchorage",      // Alaska Time (AKST)
  "Pacific/Honolulu",       // Hawaii Time (HST)
  "Europe/London",          // Greenwich Mean Time (GMT)
  "Europe/Lisbon",          // Western European Time (WET)
  "Europe/Berlin",          // Central European Time (CET)
  "Europe/Athens",          // Eastern European Time (EET)
  "Asia/Dubai",             // Gulf Standard Time (GST)
  "Asia/Kolkata",           // India Standard Time (IST)
  "Asia/Shanghai",          // China Standard Time (CST)
  "Asia/Singapore",         // Singapore Standard Time (SGT)
  "Asia/Tokyo",             // Japan Standard Time (JST)
  "Australia/Sydney",       // Australian Eastern Time (AET)
  "Pacific/Auckland",       // New Zealand Standard Time (NZST)
  "America/Sao_Paulo",      // Brasília Time (BRT)
  "Etc/UTC",                // Coordinated Universal Time (UTC)
];

export const TIMEZONE_LABELS: Record<string, string> = {
  "America/Los_Angeles": "Pacific Time (PT)",
  "America/Denver": "Mountain Time (MT)",
  "America/Chicago": "Central Time (CT)",
  "America/New_York": "Eastern Time (ET)",
  "America/Halifax": "Atlantic Time (AT)",
  "America/Anchorage": "Alaska Time (AKST)",
  "Pacific/Honolulu": "Hawaii Time (HST)",
  "Europe/London": "Greenwich Mean Time (GMT)",
  "Europe/Lisbon": "Western European Time (WET)",
  "Europe/Berlin": "Central European Time (CET)",
  "Europe/Athens": "Eastern European Time (EET)",
  "Asia/Dubai": "Gulf Standard Time (GST)",
  "Asia/Kolkata": "India Standard Time (IST)",
  "Asia/Shanghai": "China Standard Time (CST)",
  "Asia/Singapore": "Singapore Standard Time (SGT)",
  "Asia/Tokyo": "Japan Standard Time (JST)",
  "Australia/Sydney": "Australian Eastern Time (AET)",
  "Pacific/Auckland": "New Zealand Standard Time (NZST)",
  "America/Sao_Paulo": "Brasília Time (BRT)",
  "Etc/UTC": "Coordinated Universal Time (UTC)",
};