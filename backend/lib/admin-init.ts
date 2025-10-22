import bcrypt from "bcrypt";
import { storage } from "../storage";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@daywise.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // Default password - CHANGE IN PRODUCTION!
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

/**
 * Initialize admin user on backend startup
 * Checks if admin exists, creates one if not
 */
export async function initializeAdmin() {
  try {
    console.log("Checking for admin user...");

    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail(ADMIN_EMAIL);

    if (existingAdmin) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      return existingAdmin;
    }

    // Admin doesn't exist - create one
    console.log("Creating default admin user...");

    // Hash the password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const adminUser = await storage.createUser({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      businessName: "Admin",
      emailVerified: true, // Admin doesn't need email verification
      isAdmin: true, // Mark as admin
      timezone: "America/New_York",
      country: "US",
      primaryColor: "#ef4444",
      secondaryColor: "#f97316",
      accentColor: "#3b82f6",
      bookingWindow: 30
    });

    console.log(`Admin user created successfully: ${ADMIN_EMAIL}`);
    console.log(`⚠️  Default password: ${ADMIN_PASSWORD}`);
    console.log(`⚠️  Please change the admin password after first login!`);

    return adminUser;
  } catch (error) {
    console.error("Error initializing admin user:", error);
    throw error;
  }
}
