import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 2:00 AM UTC - Check for 30-day unresponsive auto-transfers
crons.daily(
  "daily-auto-transfers",
  { hourUTC: 2, minuteUTC: 0 },
  internal.communicationAssignments.processAutoTransfers,
  {} // Empty args
);

// Monthly on the 1st at 4:00 AM UTC - Rotate prayer buckets to new month
crons.monthly(
  "monthly-prayer-rotation",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.prayerAssignments.rotateBuckets,
  {} // Empty args
);

export default crons;
