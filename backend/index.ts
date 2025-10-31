import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite"; // Commented out - frontend served separately
import { convex } from "./convex-client";

const MemStore = MemoryStore(session);

const app = express();

// Exit process on unhandled rejections so PM2 can restart
// This ensures Convex failures crash the backend for PM2 auto-restart
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Exiting process for PM2 restart...');
  process.exit(1);
});

// CORS configuration - allow frontend to access backend API
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || '').split(',').filter(Boolean) // Support multiple origins, comma-separated
    : ['http://localhost:5173', 'http://localhost:5174'], // Allow local dev
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhook MUST receive raw body for signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Regular JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Configure session cookie options with sensible production defaults and env overrides
const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const sessionSameSite = process.env.SESSION_SAMESITE
  || (process.env.NODE_ENV === 'production' ? 'none' : 'lax');

const sessionCookieDomain = process.env.COOKIE_DOMAIN || undefined; // e.g. ".daywisebooking.com"

// Configure session middleware
app.use(session({
  name: "daywise_session", // Changed from "dw.sid" to avoid conflicts with old cookies
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: sessionCookieSecure, // require HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: sessionSameSite as any,
    domain: sessionCookieDomain,
    path: '/', // Explicitly set path
  }
}));

// trust proxy for correct client IPs and protocol detection behind Replit proxy
app.set("trust proxy", true);

// security headers with development-friendly CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"], // Allow Google OAuth scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://fonts.googleapis.com"], // Allow Google OAuth and fonts
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://accounts.google.com"], // Allow Google OAuth connections
      frameSrc: ["'self'", "https://accounts.google.com"], // Allow Google OAuth frames
      fontSrc: ["'self'", "https://fonts.gstatic.com"], // Allow Google Fonts
      frameAncestors: ["'self'", "https://www.canva.com", "https://*.canva.com"], // Allow embedding by Canva
    },
  },
}));

// Admin routes are protected by session-based auth in requireAdmin middleware
// No HTTP Basic Auth - uses Convex database authentication like regular login

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// hide admin from crawlers
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /admin\nDisallow: /api/admin\n");
});

(async () => {
  // Initialize admin user on startup
  const { initializeAdmin } = await import("./lib/admin-init");
  await initializeAdmin();

  const server = await registerRoutes(app);

  // Start the 24-hour reminder job for Pro users
  const { storage } = await import("./storage");
  const { sendCustomerReminder, sendBusinessReminder } = await import("./email");

  function startReminderJob() {
    const WINDOW_MINUTES = 10;      // scan window
    const INTERVAL_MS = 10 * 60 * 1000; // run every 10 min

    setInterval(async () => {
      // No try-catch - let errors crash the process so PM2 can restart it
      // PM2 will keep retrying until Convex comes back online
      const rows = await storage.getBookingsDueForReminders(WINDOW_MINUTES);
      for (const row of rows as any[]) {
        const b = row.bookings;
        const u = row.users;

        if (!u) {
          console.error(`Reminder job: user not found for booking ${b.id}`);
          continue;
        }

        // Build complete email data
        const emailData = {
          customerEmail: b.customerEmail,
          customerName: b.customerName,
          appointmentType: b.appointmentType || "Appointment",
          appointmentDate: b.appointmentDate.toISOString(),
          appointmentTime: b.appointmentDate.toLocaleString(),
          appointmentDuration: b.appointmentDuration || 60,
          businessName: u.businessName || "Business",
          businessEmail: u.email,
          businessColors: {
            primary: u.primaryColor || "#ef4444",
            secondary: u.secondaryColor || "#f97316",
            accent: u.accentColor || "#3b82f6"
          }
        };

        // If customer reminder not sent → send & mark
        if (!b.customerReminderSentAt) {
          await sendCustomerReminder(emailData);
        }

        // If business reminder not sent → send & mark
        if (!b.businessReminderSentAt) {
          await sendBusinessReminder(emailData);
        }

        await storage.markBookingRemindersSent(b.id, "both");
      }
    }, INTERVAL_MS);
  }

  startReminderJob();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add API 404 handler to ensure unknown API routes return JSON instead of HTML
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  // Vite and static serving commented out - frontend served separately
  // if (app.get("env") === "development") {
  //   await setupVite(app, server);
  // } else {
  //   serveStatic(app);
  // }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 3000 for local development (port 5000 conflicts with macOS Control Centre)
  // NOTE: In production (Vercel/Replit), set PORT environment variable to the required port
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`Backend server listening on port ${port}`);
  });
})();
