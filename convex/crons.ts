import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup job every hour at minute 0
crons.hourly(
  "cleanup expired temp form submissions",
  { minuteUTC: 0 }, // Run at the top of every hour (at minute 0)
  internal.formSubmissions.cleanupExpiredTemp
);

// Run every 15 minutes to check for bookings due for 24-hour reminders
crons.interval(
  "send-booking-reminders",
  { minutes: 15 }, // Run every 15 minutes
  internal.bookings.sendDueReminders
);

// Run daily to check for expired trial subscriptions
crons.interval(
  "expire-trial-subscriptions",
  { hours: 24 }, // Run once per day
  internal.subscriptions.processExpiredTrials
);

export default crons;
