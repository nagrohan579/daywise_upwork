import dotenv from "dotenv";
dotenv.config();

import { ConvexHttpClient } from "convex/browser";

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is not set");
}

// Create a single Convex HTTP client instance for the server
export const convex = new ConvexHttpClient(process.env.CONVEX_URL);
