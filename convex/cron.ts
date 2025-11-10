import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup job every hour at minute 0
crons.hourly(
  "cleanup expired temp form submissions",
  { minuteUTC: 0 }, // Run at the top of every hour (at minute 0)
  internal.formSubmissions.cleanupExpiredTemp
);

export default crons;
