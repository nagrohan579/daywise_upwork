import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 15 minutes to check for bookings due for 24-hour reminders
crons.interval(
  "send-booking-reminders",
  { minutes: 15 }, // Run every 15 minutes
  internal.bookings.sendDueReminders
);

export default crons;
