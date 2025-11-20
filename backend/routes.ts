import "./types.d.ts";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from 'google-auth-library';
import Stripe from "stripe";
import multer from "multer";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import crypto from "crypto";
import moment from "moment-timezone";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { mapToSupportedTimezone } from "./lib/timezoneMapper";
import { toUTC, toLocal, getDayOfWeek, getDateInTimezone, customerDateToUTC, formatDateForEmail, formatTimeForEmail, formatDateTimeForEmail } from "./lib/timezoneUtils";
import { storage } from "./storage";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { insertUserSchema, insertBookingSchema, insertAvailabilitySchema, insertBlockedDateSchema, insertAppointmentTypeSchema, insertAvailabilityPatternSchema, insertAppointmentTypeAvailabilitySchema, insertAvailabilityExceptionSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertBrandingSchema, insertFeedbackSchema, availabilitySettingsSchema, loginSchema, signupSchema, resendVerificationSchema, changePasswordSchema, changeEmailSchema, disconnectGoogleSchema, forgotPasswordSchema, resetPasswordSchema, checkoutStartSchema, validateCouponSchema } from "./schemas";
import { applyDefaults, FeaturesShape } from "./lib/features";
import { ensureStripePrices } from "./lib/stripe";
import { requireFeature, getUserFeatures } from "./lib/plan-features";
import { RESERVED_SLUGS } from "./constants";
import { toSlug, ensureUniqueSlug, generateBusinessIdentifiers } from "./lib/slug";
import { googleCalendarService } from "./lib/google-calendar";
import { z } from "zod";
import sharp from 'sharp';
import { sendCustomerConfirmation, sendBusinessNotification, sendRescheduleConfirmation, sendRescheduleBusinessNotification, sendCancellationConfirmation, sendCancellationBusinessNotification, sendBusinessCancellationConfirmation, sendFeedbackEmail, sendEmailChangeOtp, sendPasswordChangeOtp } from "./email";
import { FeatureGate } from "./featureGating";
import { uploadFile, deleteFile, isSpacesUrl, moveIntakeFormFiles } from "./services/spaces";
import PDFDocument from "pdfkit";
import archiver from "archiver";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize dayjs plugins
  dayjs.extend(utc);
  dayjs.extend(timezone);
  
  // OTP storage for email change (in-memory with expiration)
  // Format: Map<userId, { otp: string, newEmail: string, expiresAt: number }>
  const emailChangeOtps = new Map<string, { otp: string; newEmail: string; expiresAt: number }>();
  
  // OTP storage for password change (in-memory with expiration)
  // Format: Map<userId, { otp: string, expiresAt: number }>
  const passwordChangeOtps = new Map<string, { otp: string; expiresAt: number }>();
  
  // Cleanup expired OTPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of emailChangeOtps.entries()) {
      if (data.expiresAt < now) {
        emailChangeOtps.delete(userId);
      }
    }
    for (const [userId, data] of passwordChangeOtps.entries()) {
      if (data.expiresAt < now) {
        passwordChangeOtps.delete(userId);
      }
    }
  }, 5 * 60 * 1000);
  
  // Helper middleware for authentication and admin checks
  const requireAuth = (req: any, res: any, next: any) => {
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  
  // Initialize Google OAuth client
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // Initialize Stripe client
  
  // Helper function to mark Google Calendar as disconnected
  const markGoogleCalendarDisconnected = async (userId: string, req?: any) => {
    try {
      console.log(`Marking Google Calendar as disconnected for user: ${userId}`);
      
      // Disconnect calendar (clears credentials in Convex)
      await googleCalendarService.disconnect(userId);
      
      console.log(`✅ Google Calendar disconnected for user: ${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error marking Google Calendar as disconnected:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_dev");

  // Initialize multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(), 
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

  // Google OAuth start endpoint (redirect-based flow) - COMMENTED OUT
  app.get("/api/auth/google", (req, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log(`Google OAuth Config - Client ID: ${googleClientId ? 'SET' : 'NOT SET'}`);
    console.log(`Google OAuth Config - Client Secret: ${googleClientSecret ? 'SET' : 'NOT SET'}`);
    
    if (!googleClientId) {
      return res.status(500).json({ message: "Google Client ID not configured" });
    }

    // Determine redirect URI based on environment
    let redirectUri;
    const host = req.get('host');

    // Use production domain or Replit domain
    if (process.env.BASE_URL) {
      redirectUri = `${process.env.BASE_URL}/api/auth/google/callback`;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    } else {
      // For development, hardcode localhost:3000
      redirectUri = `http://localhost:3000/api/auth/google/callback`;
    }

    console.log(`Google OAuth Start - Host: ${host}, Redirect URI: ${redirectUri}`);
    console.log(`Environment check - BASE_URL: ${process.env.BASE_URL}, NODE_ENV: ${process.env.NODE_ENV}`);

    // Read timezone and country from query parameters
    const { timezone, country } = req.query;
    console.log('OAuth init - Timezone from query:', timezone);
    console.log('OAuth init - Country from query:', country);

    // Only request basic profile info for login/signup (no calendar access)
    const scope = 'openid email profile';
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15);

    // Store state, timezone, and country in session for verification and later use
    (req.session as any).oauthState = state;
    (req.session as any).oauthTimezone = timezone;
    (req.session as any).oauthCountry = country;
    
    // Force session save before redirect to ensure state is persisted
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=${responseType}&` +
      `prompt=select_account%20consent&` +
      `access_type=offline&` +
      `include_granted_scopes=true&` +
      `state=${state}`;

    console.log(`Generated Google Auth URL: ${googleAuthUrl}`);
    res.redirect(googleAuthUrl);
  });

  // Google OAuth callback endpoint (redirect-based flow)
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      console.log('=== Google OAuth Callback Debug ===');
      console.log('Callback - Session ID:', req.sessionID);
      console.log('Callback - Session object:', JSON.stringify(req.session, null, 2));
      console.log('Callback - OAuth state in session:', (req.session as any).oauthState);
      console.log('Callback - State from query:', req.query.state);
      console.log('Callback - Cookies received:', req.headers.cookie);
      console.log('===================================');
      
      const { code, state } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Read timezone and country from session (stored during OAuth initiation)
      const timezone = (req.session as any).oauthTimezone;
      const country = (req.session as any).oauthCountry;
      console.log('OAuth callback - Timezone from session:', timezone);
      console.log('OAuth callback - Country from session:', country);

      if (!code || typeof code !== 'string') {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'No authorization code received'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=no_code';
            }
          </script>
        `);
      }

      // Verify state parameter
      if (state !== (req.session as any).oauthState) {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Invalid state parameter'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=invalid_state';
            }
          </script>
        `);
      }

      // Use the same redirect URI logic as the start endpoint
      const host = req.get('host');
      let redirectUri;
      
      if (process.env.BASE_URL) {
        redirectUri = `${process.env.BASE_URL}/api/auth/google/callback`;
      } else if (process.env.REPLIT_DEV_DOMAIN) {
        redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
      } else {
        // For development, hardcode localhost:3000
        redirectUri = `http://localhost:3000/api/auth/google/callback`;
      }
      
      console.log(`Google OAuth Callback - Host: ${host}, Redirect URI: ${redirectUri}`);

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Token exchange failed'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=token_exchange_failed';
            }
          </script>
        `);
      }

      // Verify the ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Invalid token received'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=invalid_token';
            }
          </script>
        `);
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!email || !name || !googleId) {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Missing user information'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=missing_user_info';
            }
          </script>
        `);
      }

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();

      // Check if user already exists by email or Google ID
      let user = await storage.getUserByEmail(normalizedEmail) || await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Create new user from Google profile
        const { businessName, slug } = generateBusinessIdentifiers(name);
        
        const userData = {
          name,
          email: normalizedEmail,
          googleId,
          picture: picture || null,
          businessName,
          slug: await ensureUniqueSlug(slug, ''),
          timezone: timezone || 'UTC',
          country: country || 'US',
          isAdmin: false,
        };
  user = await storage.createUser(userData);
        
        // Default new users to the Free plan (no checkout)
        if (user) {
          const subscriptionPayload: any = {
            userId: user._id,
            planId: "free",
            status: "active",
            isAnnual: false,
          };
          // Only include optional fields when they have non-null values
          // (Convex validators reject explicit null)
          // stripeCustomerId / stripeSubscriptionId / renewsAt / cancelAt intentionally omitted when null
          await storage.createUserSubscription(subscriptionPayload);

          // Create default branding with new default colors
          await storage.createBranding({
            userId: user._id,
            primary: '#0053F1',
            secondary: '#64748B',
            accent: '#121212', // Text color maps to accent
            logoUrl: undefined,
            profilePictureUrl: undefined,
            displayName: undefined,
            showDisplayName: true,
            showProfilePicture: true,
            usePlatformBranding: true,
          });
        }
      } else if (!user.googleId) {
        // Link existing email account to Google
  await storage.updateUser(user._id, { 
          googleId, 
          picture: picture || user.picture,
          name: user.name || name 
        });
  user = await storage.getUser(user._id);
      }

      if (!user) {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Failed to create user account'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/login?error=user_creation_failed';
            }
          </script>
        `);
      }

      // Set session data
      (req.session as any).userId = user._id;
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };

      // Clear OAuth state
      delete (req.session as any).oauthState;

      // Store Google Calendar credentials if we have access and refresh tokens
      console.log('Google OAuth tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        scope: tokens.scope,
        expiry_date: tokens.expiry_date
      });
      
      // Note: Calendar credentials should NOT be stored during signup/login
      // Users must explicitly connect their calendar after authentication
      // via the /api/google-calendar/auth flow
      if (tokens.access_token && tokens.refresh_token) {
        console.log('OAuth tokens available, but calendar connection must be done separately');
      }

      // Create user data for response
      const userData = {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: user.isAdmin
      };

      // Determine redirect URL based on onboarding status
      const redirectPage = user.onboardingCompleted ? '/booking' : '/onboarding';

      // For popup window, close the popup and redirect parent
      res.send(`
        <script>
          if (window.opener) {
            // Notify parent window and close popup
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: ${JSON.stringify(userData)},
              redirectTo: '${redirectPage}'
            }, '*');
            window.close();
          } else {
            // Fallback: redirect to frontend
            window.location.href = '${frontendUrl}${redirectPage}';
          }
        </script>
      `);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      console.error('Google OAuth callback error:', error);
      
      // For popup window, send error message and close
      res.send(`
        <script>
          if (window.opener) {
            // Notify parent window of error and close popup
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: 'Authentication failed. Please try again.'
            }, '*');
            window.close();
          } else {
            // Fallback: redirect to frontend with error
            window.location.href = '${frontendUrl}/login?error=oauth_failed';
          }
        </script>
      `);
    }
  });

  // Google Calendar OAuth routes
  app.get("/api/google-calendar/auth", async (req, res) => {
    try {
      console.log('Google Calendar auth request - Session:', req.session);
      console.log('Google Calendar auth request - UserId:', (req.session as any)?.userId);
      
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        console.log('No userId in session, returning 401');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('User ID for Google Calendar auth:', userId);
      
      const authUrl = googleCalendarService.getAuthUrl(userId, req);
      console.log('Generated auth URL:', authUrl);
      
      // Check if authUrl is valid
      if (!authUrl || !authUrl.startsWith('https://accounts.google.com')) {
        console.error('Invalid auth URL generated:', authUrl);
        return res.status(500).json({ error: 'Failed to generate auth URL' });
      }
      
      // Redirect directly to Google OAuth
      console.log('Redirecting to:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google Calendar auth start error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/booking?calendar_error=auth_failed`);
    }
  });

  app.get("/api/google-calendar/callback", async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      if (!code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
        return res.redirect(`${frontendUrl}/booking?calendar_error=invalid_callback`);
      }

      console.log('=== Google Calendar Callback Start ===');
      console.log('UserId from state:', userId);
      console.log('Session ID:', req.sessionID);
      
      const result = await googleCalendarService.handleCallback(code, userId, req);

      if (result.success) {
        console.log('✅ Google Calendar connection successful for user:', userId);
        
        // Sync existing bookings to Google Calendar
        try {
          console.log('Calendar connected successfully, syncing existing bookings...');
          
          // Get all confirmed bookings for this user that don't have a calendar event yet
          const bookings = await storage.getBookingsByUser(userId);
          const bookingsToSync = bookings.filter(b => 
            b.status === 'confirmed' && !b.googleCalendarEventId
          );
          
          console.log(`Found ${bookingsToSync.length} bookings to sync to Google Calendar`);
          
          for (const booking of bookingsToSync) {
            try {
              const appointmentDateObj = new Date(booking.appointmentDate);
              const appointmentEnd = new Date(appointmentDateObj.getTime() + (booking.duration || 30) * 60 * 1000);
              const customEventId = `daywise_${booking._id}`.replace(/[^a-v0-9]/g, '').substring(0, 64);
              
              const calendarResult = await googleCalendarService.createCalendarEvent(userId, {
                summary: `Appointment - ${booking.customerName}`,
                description: `Appointment with ${booking.customerName} (${booking.customerEmail})`,
                start: appointmentDateObj,
                end: appointmentEnd,
                attendees: [booking.customerEmail],
                customEventId: customEventId, // Use custom ID for idempotency
              });
              
              if (calendarResult.success && calendarResult.eventId) {
                await storage.updateBooking(booking._id, { 
                  googleCalendarEventId: calendarResult.eventId 
                });
                console.log(`✅ Synced booking ${booking._id} to calendar event ${calendarResult.eventId}`);
                if (calendarResult.alreadyExists) {
                  console.log('Note: Event already existed (preventing duplicate)');
                }
              }
            } catch (syncError) {
              console.error(`Failed to sync booking ${booking._id}:`, syncError);
              // Continue with other bookings even if one fails
            }
          }
          
          console.log('Finished syncing existing bookings to Google Calendar');
        } catch (syncError) {
          console.error('Error during booking sync:', syncError);
          // Don't fail the connection if sync fails
        }
        
        // Force session save to ensure cookie is updated before redirect
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session after calendar connection:', err);
              reject(err);
            } else {
              console.log('✅ Session saved successfully after calendar connection');
              resolve();
            }
          });
        });
        
        console.log('=== Google Calendar Callback Complete - Redirecting ===');
        // Redirect back to booking page with success parameter
        return res.redirect(`${frontendUrl}/booking?calendar_connected=true`);
      } else {
        console.error('❌ Google Calendar connection failed:', result.error);
        // Redirect back with error
        return res.redirect(`${frontendUrl}/booking?calendar_error=${encodeURIComponent(result.error || 'connection_failed')}`);
      }
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      console.error('Google Calendar callback error:', error);
      return res.redirect(`${frontendUrl}/booking?calendar_error=connection_failed`);
    }
  });

  app.get("/api/google-calendar/status", async (req, res) => {
    try {
      console.log('Google Calendar status request - Session:', req.session);
      console.log('Google Calendar status request - UserId from session:', (req.session as any)?.userId);
      
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        console.log('No userId found in session for calendar status check');
        return res.status(401).json({ message: "Authentication required", connected: false });
      }

      console.log('Google Calendar status - Resolved userId:', userId, 'type:', typeof userId);

      const status = await googleCalendarService.getConnectionStatus(userId);
      console.log('Google Calendar status result:', status);
      res.json(status);
    } catch (error) {
      console.error('Google Calendar status error:', error);
      res.status(500).json({ message: "Failed to get calendar status", connected: false });
    }
  });

  app.post("/api/google-calendar/disconnect", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await googleCalendarService.disconnect(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Google Calendar disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  app.post("/api/google-calendar/sync", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const result = await googleCalendarService.syncAllBookings(userId);
      res.json(result);
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      res.status(500).json({ message: "Failed to sync bookings to calendar" });
    }
  });

  // Get calendar events
  app.get("/api/google-calendar/events", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { timeMin, timeMax } = req.query;
      const startDate = timeMin ? new Date(timeMin as string) : undefined;
      const endDate = timeMax ? new Date(timeMax as string) : undefined;

      const result = await googleCalendarService.getCalendarEvents(
        userId,
        startDate,
        endDate
      );
      
      res.json(result);
    } catch (error) {
      console.error('Google Calendar events error:', error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Create calendar event
  app.post("/api/google-calendar/events", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        console.log('Google Calendar event creation - No userId in session');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('Google Calendar event creation - User ID:', userId);

      const { summary, description, start, end, attendees } = req.body;
      
      if (!summary || !start || !end) {
        console.log('Google Calendar event creation - Missing required fields');
        return res.status(400).json({ message: "Missing required fields: summary, start, end" });
      }

      console.log('Google Calendar event creation - Event data:', { summary, start, end, attendees });

      const result = await googleCalendarService.createCalendarEvent(
        userId,
        {
          summary,
          description,
          start: new Date(start),
          end: new Date(end),
          attendees
        }
      );
      
      console.log('Google Calendar event creation - Result:', result);
      res.json(result);
    } catch (error) {
      console.error('Google Calendar create event error:', error);
      console.error('Google Calendar create event error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to create calendar event",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Update calendar event
  app.put("/api/google-calendar/events/:eventId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        console.log('Google Calendar event update - No userId in session');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('Google Calendar event update - User ID:', userId);

      const { eventId } = req.params;
      const { summary, description, start, end, attendees } = req.body;

      console.log('Google Calendar event update - Event ID:', eventId);
      console.log('Google Calendar event update - Update data:', { summary, start, end, attendees });

      const result = await googleCalendarService.updateCalendarEvent(
        userId,
        eventId,
        {
          summary,
          description,
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          attendees
        }
      );
      
      console.log('Google Calendar event update - Result:', result);
      res.json(result);
    } catch (error) {
      console.error('Google Calendar update event error:', error);
      console.error('Google Calendar update event error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to update calendar event",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete calendar event
  app.delete("/api/google-calendar/events/:eventId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { eventId } = req.params;

      const result = await googleCalendarService.deleteCalendarEvent(
        userId,
        eventId
      );
      
      res.json(result);
    } catch (error) {
      console.error('Google Calendar delete event error:', error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Google OAuth login route (ID token-based flow - fallback)
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
      }

      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(400).json({ message: "Invalid Google token" });
      }

      const { sub: googleId, email, name, picture } = payload;
      
      if (!email || !name || !googleId) {
        return res.status(400).json({ message: "Missing required user information from Google" });
      }

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();

      // Check if user already exists by email or Google ID
      let user = await storage.getUserByEmail(normalizedEmail) || await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Create new user from Google profile
        const userData = {
          name,
          email: normalizedEmail,
          googleId,
          picture: picture || null,
          businessName: name + "'s Business",
          timezone: 'UTC',
          country: 'US',
          isAdmin: false,
        };
        user = await storage.createUser(userData);
        
        // Default new users to the Free plan (no checkout)
        if (user) {
          const subscriptionPayload: any = {
            userId: user._id,
            planId: "free",
            status: "active",
            isAnnual: false,
          };
          await storage.createUserSubscription(subscriptionPayload);
        }
      } else if (!user.googleId) {
        // Link existing email account to Google
  await storage.updateUser(user._id, { 
          googleId, 
          picture: picture || user.picture,
          name: user.name || name 
        });
  user = await storage.getUser(user._id);
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create or retrieve user" });
      }

      // Set session data
  (req.session as any).userId = user._id;
      (req.session as any).user = {
  id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };

      res.json({ 
        message: "Login successful", 
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name, 
          picture: user.picture,
          isAdmin: user.isAdmin 
        } 
      });
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.status(500).json({ message: "Google authentication failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Email/password login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // Check if user exists in storage
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "No account found with this email. Please sign up first." });
      }

      // Block admin users from using regular login
      if (user.isAdmin) {
        return res.status(403).json({ message: "Admin accounts cannot use regular login. Please use the admin login portal." });
      }

      // Handle regular users with password verification
      if (!user.password) {
        return res.status(400).json({ message: "This account was created with Google OAuth. Please sign in with Google." });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. Check your inbox for a verification link.",
          requiresVerification: true
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session data (use _id from Convex)
      (req.session as any).userId = user._id;
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };
      
      res.json({ 
        message: "Login successful", 
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name, 
          isAdmin: user.isAdmin 
        } 
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin login endpoint - same as regular login, but for admin users only
  app.post("/api/admin/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // Check if user exists in storage (uses Convex)
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is actually an admin
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Verify password exists
      if (!user.password) {
        return res.status(400).json({ message: "Invalid admin account configuration" });
      }

      // Verify password using bcrypt (same as regular login)
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session data (same as regular login)
      (req.session as any).userId = user._id;
      (req.session as any).isAdmin = true; // Set isAdmin flag for requireAdmin middleware
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };

      res.json({
        message: "Admin login successful",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isAdmin: true
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: "Admin login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin stats endpoint - REMOVED: Using the comprehensive one below with requireAdmin middleware

  // Email signup endpoint with verification
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log('=== Signup Request Debug ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('===========================');

      const validatedData = signupSchema.parse(req.body);
      const { email, name, password, timezone, country } = validatedData;

      console.log('Validated timezone:', timezone);
      console.log('Validated country:', country);

      // Check if user already exists
      let existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Check if it's an admin account
        if (existingUser.isAdmin) {
          return res.status(403).json({ message: "This email is reserved for administrative use" });
        }
        return res.status(409).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate verification token
      const verificationToken = crypto.randomUUID();
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now (Unix timestamp)

      // Generate business name and slug from user's name
      const { businessName, slug } = generateBusinessIdentifiers(name);

      // Create unverified user with hashed password
      const userData = {
        name,
        email: email.toLowerCase(),
        password: hashedPassword, // Store hashed password
        emailVerified: false,
        businessName,
        slug: await ensureUniqueSlug(slug, ''),
        timezone: timezone || 'UTC',
        country: country || 'US',
        isAdmin: false,
        primaryColor: '#0053F1',
        secondaryColor: '#64748B',
        accentColor: '#121212',
        bookingWindow: 60,
      };

      const user = await storage.createUser(userData);

      if (!user) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      // Now update the user with verification token
      await storage.updateUser(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      // Default new users to the Free plan (no checkout)
      const subscriptionPayload: any = {
        userId: user._id,
        planId: "free",
        status: "active",
        isAnnual: false,
      };
      await storage.createUserSubscription(subscriptionPayload);

      // Create default branding with new default colors
      // Text color maps to accent
      await storage.createBranding({
        userId: user._id,
        primary: '#0053F1',
        secondary: '#64748B',
        accent: '#121212', // Text color is stored as accent
        logoUrl: undefined,
        profilePictureUrl: undefined,
        displayName: undefined,
        showDisplayName: true,
        showProfilePicture: true,
        usePlatformBranding: true,
      });

      // Create default availability for new user (Mon-Fri 9am-5pm, Sat-Sun unavailable)
      const defaultWeeklySchedule = {
        monday: [{ start: "09:00", end: "17:00" }],
        tuesday: [{ start: "09:00", end: "17:00" }],
        wednesday: [{ start: "09:00", end: "17:00" }],
        thursday: [{ start: "09:00", end: "17:00" }],
        friday: [{ start: "09:00", end: "17:00" }],
        saturday: [], // Empty array = unavailable (will create entry with isAvailable: false)
        sunday: [],   // Empty array = unavailable (will create entry with isAvailable: false)
      };

      await storage.updateWeeklyAvailability(user._id, defaultWeeklySchedule);

      // Send verification email
      try {
        // Determine frontend URL based on environment
        const frontendUrl = process.env.FRONTEND_URL || 
                           (process.env.NODE_ENV === 'production' 
                             ? `${req.protocol}://${req.get('host')}` 
                             : 'http://localhost:5173'); // Frontend dev server
        
        const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;
        
        await sendVerificationEmail(email, name, verificationUrl);
        
        res.json({ 
          message: "Account created successfully. Please check your email to verify your account.",
          requiresVerification: true
        });
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        
        // Return specific error message to frontend
        const errorMessage = emailError.message || 'Failed to send verification email';
        return res.status(500).json({ 
          message: `Account created but email verification failed: ${errorMessage}`,
          error: errorMessage,
          requiresVerification: true,
          emailFailed: true
        });
      }
      
    } catch (error) {
      console.error('Email signup error:', error);
      res.status(500).json({ message: "Signup failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Email verification endpoint
  // Email verification endpoint (redirects from email link)
  app.get("/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).send("Verification token is required");
      }

      // Find user with this token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).send("Invalid or expired verification token");
      }

      // Check if token has expired
      if (user.emailVerificationExpires && new Date().getTime() > user.emailVerificationExpires) {
        return res.status(400).send("Verification token has expired");
      }

      // Verify the user in database
      await storage.verifyUserEmail(user._id);

      // Log the user in by setting session
      (req.session as any).userId = user._id;
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };

      // Determine frontend URL based on environment
      const frontendUrl = process.env.FRONTEND_URL || 
                         process.env.NODE_ENV === 'production' 
                           ? '' // Same domain in production
                           : 'http://localhost:5173'; // Frontend dev server

      // Redirect to frontend onboarding page with verified flag
      res.redirect(`${frontendUrl}/verify?verified=true`);
      
    } catch (error) {
      console.error('Email verification error:', error);
      
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 
                         process.env.NODE_ENV === 'production' 
                           ? '' 
                           : 'http://localhost:5173';
      res.redirect(`${frontendUrl}/verify-error?message=Verification failed`);
    }
  });

  // API endpoint for frontend to verify email token
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Find user with this token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Check if token has expired
      if (user.emailVerificationExpires && new Date().getTime() > user.emailVerificationExpires) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      // Verify the user in database
      await storage.verifyUserEmail(user._id);

      // Log the user in by setting session
      (req.session as any).userId = user._id;
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      };

      res.json({ 
        message: "Email verified successfully", 
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name,
          isAdmin: user.isAdmin 
        } 
      });
      
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: "Verification failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate new verification token
      const verificationToken = crypto.randomUUID();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
  await storage.updateUserVerificationToken(user._id, verificationToken, verificationExpires);

      // Send verification email
      const frontendUrl = process.env.FRONTEND_URL || 
                         (process.env.NODE_ENV === 'production' 
                           ? `${req.protocol}://${req.get('host')}` 
                           : 'http://localhost:5173');
      const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;
      await sendVerificationEmail(email, user.name, verificationUrl);
      
      res.json({ message: "Verification email resent successfully" });
      
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: "Failed to resend verification email", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Logout failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const requestTimestamp = new Date().toISOString();
      console.log('=== Auth /api/auth/me Debug ===');
      console.log('Request timestamp:', requestTimestamp);
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('Cookies received:', req.headers.cookie);
      console.log('Session ID:', req.sessionID);
      console.log('Session object:', JSON.stringify(req.session, null, 2));
      console.log('UserId from session:', (req.session as any).userId);
      console.log('User from session:', (req.session as any).user);
      console.log('================================');
      
      if (!(req.session as any).userId) {
        console.log('❌ No userId in session - returning 401');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = (req.session as any).userId;
      console.log('✅ UserId found in session:', userId);
      
      // ALWAYS fetch fresh user data from DB (never rely on cached session)
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('❌ User not found in storage for userId:', userId);
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log('✅ User loaded from DB:', { id: user._id, email: user.email, name: user.name });
      
      // ALWAYS check fresh Google Calendar connection status from DB
      let googleCalendarConnected = false;
      try {
        console.log('Checking Google Calendar connection status from DB...');
        const calendarStatus = await googleCalendarService.getConnectionStatus(user._id);
        googleCalendarConnected = calendarStatus.connected === true;
        console.log('✅ Calendar status retrieved:', { 
          connected: calendarStatus.connected,
          connectedAccount: calendarStatus.connectedAccount,
          isSynced: calendarStatus.isSynced 
        });
      } catch (error) {
        console.log('⚠️ Error checking calendar status:', error);
        googleCalendarConnected = false;
      }
      
      console.log('Auth me - Final user state:', { 
        id: user._id, 
        email: user.email, 
        name: user.name,
        googleCalendarConnected 
      });
      console.log('Auth me - Response timestamp:', new Date().toISOString());
      console.log('================================');
      
      // Return comprehensive user data for account page
      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          isAdmin: user.isAdmin,
          businessName: user.businessName,
          welcomeMessage: user.welcomeMessage,
          timezone: user.timezone,
          country: user.country,
          primaryColor: user.primaryColor,
          secondaryColor: user.secondaryColor,
          accentColor: user.accentColor,
          slug: user.slug,
          googleId: user.googleId,
          emailVerified: user.emailVerified,
          accountStatus: user.accountStatus || 'active', // Default to 'active' for existing users
          googleCalendarConnected: googleCalendarConnected // ✅ Fresh from DB, never cached
        }
      });
    } catch (error) {
      console.error('❌ /api/auth/me error:', error);
      res.status(500).json({ message: "Failed to get user info", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Debug endpoint to verify cookies and session (REMOVE IN PRODUCTION after debugging)
  app.get("/api/debug/session", (req, res) => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      cookies: {
        raw: req.headers.cookie || 'No cookies received',
        parsed: req.cookies || 'No parsed cookies'
      },
      session: {
        id: req.sessionID || 'No session ID',
        userId: (req.session as any)?.userId || 'No userId in session',
        sessionData: req.session || 'No session object'
      },
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent'],
        cookie: req.headers.cookie
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        FRONTEND_URL: process.env.FRONTEND_URL,
        SESSION_SAMESITE: process.env.SESSION_SAMESITE,
        SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
      }
    };
    
    console.log('=== Debug endpoint called ===');
    console.log(JSON.stringify(debugInfo, null, 2));
    
    res.json(debugInfo);
  });

  // Account management routes
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 12) {
        return res.status(400).json({ message: "New password must be at least 12 characters long" });
      }

      // Get current user
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a password (not Google-only account)
      if (!user.password) {
        return res.status(400).json({ message: "Cannot change password for Google-only accounts" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updateUser(session.userId, { password: hashedNewPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: "Failed to change password", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/auth/change-email", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { newEmail, password } = req.body;
      
      if (!newEmail) {
        return res.status(400).json({ message: "New email is required" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For password accounts, verify password
      if (user.password && !password) {
        return res.status(400).json({ message: "Password is required to change email" });
      }

      if (user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Password is incorrect" });
        }
      }

      // Check if new email is already in use
      const existingUser = await storage.getUserByEmail(newEmail.toLowerCase().trim());
  if (existingUser && existingUser._id !== session.userId) {
        return res.status(409).json({ message: "Email already in use by another account" });
      }

      // Generate verification token for new email
      const verificationToken = crypto.randomUUID();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new email (unverified) and verification token
      await storage.updateUser(session.userId, {
        email: newEmail.toLowerCase().trim(),
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Send verification email to new address
      try {
        const frontendUrl = process.env.FRONTEND_URL || 
                           (process.env.NODE_ENV === 'production' 
                             ? `${req.protocol}://${req.get('host')}` 
                             : 'http://localhost:5173');
        const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;
        await sendVerificationEmail(newEmail, user.name, verificationUrl);
        
        res.json({ 
          message: "Email updated. Please check your new email address for verification.",
          requiresVerification: true
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        res.json({ 
          message: "Email updated. Please check your new email address for verification.",
          requiresVerification: true
        });
      }
    } catch (error) {
      console.error('Change email error:', error);
      res.status(500).json({ message: "Failed to change email", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/auth/disconnect-google", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { password } = req.body;
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has Google account connected
      if (!user.googleId) {
        return res.status(400).json({ message: "No Google account connected" });
      }

      // Require password to disconnect Google account for security
      if (!user.password) {
        return res.status(400).json({ 
          message: "You must set a password before disconnecting Google account. Please change your password first." 
        });
      }

      if (!password) {
        return res.status(400).json({ message: "Password is required to disconnect Google account" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Password is incorrect" });
      }

      // Disconnect Google account
      await storage.updateUser(session.userId, { 
        googleId: null,
        picture: null
      });

      res.json({ message: "Google account disconnected successfully" });
    } catch (error) {
      console.error('Disconnect Google error:', error);
      res.status(500).json({ message: "Failed to disconnect Google account", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const { email } = validatedData;

      const user = await storage.getUserByEmail(email);
      
      // For security, don't reveal if user exists or not
      if (!user) {
        return res.json({ message: "If an account exists with this email, a password reset link will be sent." });
      }

      // Check if user has password (not Google-only account)
      if (!user.password) {
        return res.json({ message: "If an account exists with this email, a password reset link will be sent." });
      }

      // Generate password reset token
      const resetToken = crypto.randomUUID();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      await storage.updatePasswordResetToken(user._id, resetToken, resetExpires);

      // Send password reset email
      try {
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail(email, user.name, resetUrl);
        
        res.json({ message: "If an account exists with this email, a password reset link will be sent." });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        res.json({ message: "If an account exists with this email, a password reset link will be sent." });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const { token, newPassword } = validatedData;

      // Find user with this reset token
      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (user.passwordResetExpires && Date.now() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new password reset." });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Reset password and clear reset token
      await storage.resetPassword(user._id, hashedPassword);

      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // count bookings in current month for this user
  async function countBookingsThisMonth(req: any) {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const userId = bookingData.userId;
      if (!userId) return 0;
      
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const userBookings = await storage.getBookingsByUser(userId);
      const bookingsThisMonth = userBookings.filter(booking => {
        if (!booking._creationTime) return false;
        const bookingDate = new Date(booking._creationTime);
        return bookingDate >= start && bookingDate < end;
      });
      
      return bookingsThisMonth.length;
    } catch (error) {
      // If parsing fails or other error, return 0 to allow the main handler to do proper validation
      return 0;
    }
  }

  // Onboarding completion endpoint
  app.post("/api/onboarding/complete", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { industry, otherIndustry, weeklyAvailability, timezone, services, businessName, bookingSlug } = req.body;

      // Step 1: Save industry (otherIndustry takes priority)
      if (otherIndustry) {
        await storage.updateUser(userId, { industry: otherIndustry });
      } else if (industry) {
        await storage.updateUser(userId, { industry });
      }

      // Step 2: Save weekly availability + timezone
      if (weeklyAvailability && Object.keys(weeklyAvailability).length > 0) {
        await storage.updateUser(userId, {
          weeklyHours: weeklyAvailability,
          timezone: timezone || 'UTC'
        });
      } else if (timezone) {
        await storage.updateUser(userId, { timezone });
      }

      // Step 3: Create services (appointment types)
      if (services && services.length > 0) {
        for (const service of services) {
          await storage.createAppointmentType({
            userId,
            name: service.name,
            description: service.description || '',
            duration: service.duration,
            bufferTimeBefore: 0,
            bufferTime: service.bufferTime || 0,
            price: service.price || 0,
            color: service.color,
            isActive: service.isActive !== false,
            sortOrder: 0
          });
        }
      }

      // Step 4: Save business info (name + slug)
      const businessUpdates: any = {};
      if (businessName) businessUpdates.businessName = businessName;
      if (bookingSlug) businessUpdates.slug = bookingSlug;

      if (Object.keys(businessUpdates).length > 0) {
        await storage.updateUser(userId, businessUpdates);
      }

      // Mark onboarding as completed
      await storage.updateUser(userId, { onboardingCompleted: true });

      res.json({ success: true, message: "Onboarding completed successfully" });
    } catch (error) {
      console.error('Onboarding error:', error);
      res.status(500).json({
        message: "Failed to complete onboarding",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Booking routes (with feature enforcement)
  // Internal booking endpoint - simplified for booking page use (authenticated users only)
  app.post("/api/bookings", async (req, res) => {
    try {
      const { customerName, customerEmail, appointmentDate, appointmentTypeId } = req.body;
      
      // Get userId from session
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check user's plan and enforce booking limit (5 per month for free plan)
      const features = await getUserFeatures(userId);
      if (features.bookingLimit !== null) {
        // Get current bookings count for this user
        const existingBookings = await storage.getBookingsByUser(userId);
        
        // Filter bookings for current month (bookings made within this calendar month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthBookings = existingBookings.filter((booking: any) => {
          const bookingDate = new Date(booking.appointmentDate);
          return bookingDate.getMonth() === currentMonth && 
                 bookingDate.getFullYear() === currentYear;
        });
        
        const currentCount = currentMonthBookings.length;
        
        if (currentCount >= features.bookingLimit) {
          return res.status(403).json({ 
            message: `Upgrade to Pro plan to add more bookings. You have reached your monthly limit of ${features.bookingLimit} bookings.` 
          });
        }
      }

      console.log('POST /api/bookings - User ID from session:', userId, 'Type:', typeof userId);

      // Validation
      if (!customerName?.trim()) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      if (!customerEmail?.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }
      if (!appointmentDate) {
        return res.status(400).json({ message: "Appointment date is required" });
      }

      // Log for debugging
      console.log('POST /api/bookings - Creating booking:', {
        userId,
        customerName,
        customerEmail,
        appointmentDate,
        appointmentDateType: typeof appointmentDate,
      });

      // Generate booking token
      const bookingToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Convert appointmentDate to timestamp
      let appointmentTimestamp: number;
      if (typeof appointmentDate === 'number') {
        appointmentTimestamp = appointmentDate;
      } else if (typeof appointmentDate === 'string') {
        appointmentTimestamp = new Date(appointmentDate).getTime();
      } else if (appointmentDate instanceof Date) {
        appointmentTimestamp = appointmentDate.getTime();
      } else {
        throw new Error('Invalid appointmentDate format');
      }

      console.log('POST /api/bookings - Converted timestamp:', appointmentTimestamp);

      // Create booking with appointmentTypeId if provided
      const bookingData: any = {
        userId,
        customerName,
        customerEmail,
        appointmentDate: appointmentTimestamp,
        duration: 30, // Default duration
        status: "confirmed",
        bookingToken,
      };

      // Add appointmentTypeId if it exists (optional field)
      if (appointmentTypeId) {
        bookingData.appointmentTypeId = appointmentTypeId;
      }
      
      console.log('POST /api/bookings - Booking data to create:', bookingData);

      let booking;
      try {
        booking = await storage.createBooking(bookingData);
      } catch (convexError) {
        console.error('POST /api/bookings - Convex error:', convexError);
        console.error('POST /api/bookings - Error details:', JSON.stringify(convexError, null, 2));
        throw convexError;
      }
      
      if (!booking) {
        return res.status(500).json({ message: "Failed to create booking" });
      }

      console.log('POST /api/bookings - Booking created successfully:', booking._id);

      // Create Google Calendar event if connected
      // Generate a custom event ID based on booking ID for idempotency
      const customEventId = `daywise_${booking._id}`.replace(/[^a-v0-9]/g, '').substring(0, 64);
      const appointmentDateObj = new Date(appointmentTimestamp);
      const appointmentEnd = new Date(appointmentDateObj.getTime() + 30 * 60 * 1000); // 30 min default
      
      // Get appointment type name for Google Calendar event
      let appointmentTypeName = 'Appointment';
      if (appointmentTypeId) {
        try {
          const appointmentType = await storage.getAppointmentType(appointmentTypeId);
          if (appointmentType) {
            appointmentTypeName = appointmentType.name;
          }
        } catch (error) {
          console.error('Failed to fetch appointment type for Google Calendar:', error);
        }
      }
      
      googleCalendarService.createCalendarEvent(userId, {
        summary: `${appointmentTypeName} with ${customerName}`,
        description: `${appointmentTypeName} with ${customerName} (${customerEmail})`,
        start: appointmentDateObj,
        end: appointmentEnd,
        attendees: [customerEmail],
        customEventId: customEventId, // Use custom ID for idempotency
      }).then(async (result) => {
        // Update booking with Google Calendar event ID
        if (result.success && result.eventId && booking._id) {
          try {
            await storage.updateBooking(booking._id, { googleCalendarEventId: result.eventId });
            console.log(`✅ Google Calendar event created and linked to booking: ${result.eventId}`);
            if (result.alreadyExists) {
              console.log('Note: Event already existed (idempotency check passed)');
            }
          } catch (error) {
            console.error('Failed to update booking with Google Calendar event ID:', error);
          }
        }
      }).catch(error => {
        console.log('Google Calendar integration not connected or failed:', error.message);
      });

      res.json({ message: "Booking created successfully", booking });
    } catch (error) {
      console.error('POST /api/bookings - Error:', error);
      console.error('POST /api/bookings - Error type:', typeof error);
      console.error('POST /api/bookings - Error name:', error instanceof Error ? error.name : 'unknown');
      console.error('POST /api/bookings - Error message:', error instanceof Error ? error.message : String(error));
      
      // Format error message properly
      let errorMessage = "Invalid booking data";
      let errorDetails = "Unknown error";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
        errorDetails = error;
      } else {
        try {
          errorDetails = JSON.stringify(error, null, 2);
        } catch (e) {
          errorDetails = String(error);
        }
      }
      
      res.status(400).json({ 
        message: errorMessage,
        error: errorDetails,
      });
    }
  });

  // PUBLIC booking endpoint - for public booking page (/:slug)
  app.post("/api/public-bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Additional validation for critical fields
      if (!bookingData.customerName?.trim()) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      if (!bookingData.customerEmail?.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      // Validate appointment type belongs to user and get duration
      const userId = bookingData.userId;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required for booking" });
      }
      
      if (!bookingData.appointmentTypeId) {
        return res.status(400).json({ message: "Appointment type ID is required" });
      }
      const appointmentType = await storage.getAppointmentType(bookingData.appointmentTypeId);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      if (appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Appointment type does not belong to this user" });
      }

      const appointmentDate = new Date(bookingData.appointmentDate);
      const appointmentDuration = appointmentType.duration || 30;
      const durationMs = appointmentDuration * 60 * 1000;
      const appointmentEnd = new Date(appointmentDate.getTime() + durationMs);

      // Check for blocked dates conflict
      const blockedDates = await storage.getBlockedDatesByUser(userId);
      const hasBlockedConflict = blockedDates.some(blocked => {
        const blockStart = new Date(blocked.startDate);
        let blockEnd = new Date(blocked.endDate);
        
        // For all-day blocks, extend to end of day
        if (blocked.isAllDay) {
          blockEnd.setHours(23, 59, 59, 999);
        }
        
        // Check for overlap: appointment overlaps if start < blockEnd AND end > blockStart
        return appointmentDate < blockEnd && appointmentEnd > blockStart;
      });

      if (hasBlockedConflict) {
        return res.status(409).json({ 
          message: "The selected date and time is not available due to blocked dates. Please choose a different time slot." 
        });
      }

      // Re-check availability at booking time to prevent race conditions
      // Exclude cancelled and deleted bookings - they don't block time slots
      const existingUserBookings = await storage.getBookingsByUser(userId);
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const sameDay = existingUserBookings.filter(booking => {
        // Only check active bookings (not cancelled or deleted)
        if (booking.status === 'cancelled' || booking.status === 'deleted') {
          return false;
        }
        const bookingDate = new Date(booking.appointmentDate).toISOString().split('T')[0];
        return bookingDate === dateStr;
      });

      const hasBookingConflict = sameDay.some(existing => {
        const existingStart = new Date(existing.appointmentDate);
        const existingEnd = new Date(existingStart.getTime() + (existing.duration || 30) * 60 * 1000);
        
        // Check for overlap between new appointment and existing booking
        return appointmentDate < existingEnd && appointmentEnd > existingStart;
      });

      if (hasBookingConflict) {
        return res.status(409).json({ 
          message: "The selected time slot is no longer available. Please choose a different time." 
        });
      }
      
      const booking = await storage.createBooking(bookingData);

      if (!booking) {
        return res.status(500).json({ message: "Failed to create booking" });
      }

      // Handle intake form submission if formSessionId is provided
      if (bookingData.formSessionId) {
        try {
          console.log(`Processing intake form submission for sessionId: ${bookingData.formSessionId}`);

          // Get temp submission
          const tempSubmission = await storage.getTempFormSubmissionBySession(bookingData.formSessionId);
          if (!tempSubmission) {
            console.warn(`Temp form submission not found for sessionId: ${bookingData.formSessionId}`);
          } else {
            // Step 1: Move files from temp to permanent storage
            let newFileUrls: string[] = [];
            if (tempSubmission.fileUrls && tempSubmission.fileUrls.length > 0) {
              const { moveIntakeFormFiles } = await import('./services/spaces');
              newFileUrls = await moveIntakeFormFiles(tempSubmission.fileUrls, booking._id);
              console.log(`✅ Moved ${newFileUrls.length} files from temp to booking ${booking._id}`);
            }

            // Step 2: Update responses with new file URLs
            const updatedResponses = tempSubmission.responses.map((response: any) => {
              if (response.fileUrls && Array.isArray(response.fileUrls)) {
                // Match old URLs to new URLs
                const updatedFileUrls = response.fileUrls.map((oldUrl: string) => {
                  const index = tempSubmission.fileUrls.indexOf(oldUrl);
                  return index !== -1 ? newFileUrls[index] : oldUrl;
                });
                return { ...response, fileUrls: updatedFileUrls };
              }
              return response;
            });

            // Step 3: Update temp submission with new file URLs before finalizing
            await storage.updateTempFormSubmission(bookingData.formSessionId, {
              responses: updatedResponses,
              fileUrls: newFileUrls,
            });

            // Step 4: Finalize form submission (creates permanent record and deletes temp)
            const formSubmissionResult = await storage.finalizeFormSubmission(
              bookingData.formSessionId,
              booking._id
            );

            console.log(`✅ Form submission finalized:`, formSubmissionResult);
          }
        } catch (formError) {
          console.error('Failed to finalize form submission:', formError);
          // Don't fail the booking if form submission fails
        }
      }

      // Send confirmation emails
      const businessUser = await storage.getUser(bookingData.userId || 'demo-user-id');
      const emailAppointmentType = await storage.getAppointmentType(bookingData.appointmentTypeId);
      
      if (businessUser && emailAppointmentType) {
        // Fetch branding data for enhanced email styling
        let branding = await storage.getBranding(businessUser._id);
        if (!branding) {
          // Use default branding values if none exists
          branding = {
            userId: businessUser._id,
            primary: '#0053F1',
            secondary: '#64748B',
            accent: '#121212',
            logoUrl: undefined,
            usePlatformBranding: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } as any;
        }
        
        const appointmentDate = new Date(bookingData.appointmentDate);

        // Generate unique event URL for email (not stored in database)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const eventUrl = `${frontendUrl}/event/${booking.bookingToken}`;
        
        console.log('Booking created with bookingToken:', booking.bookingToken);
        console.log('Generated eventUrl:', eventUrl);
        console.log('Frontend URL:', frontendUrl);

        // Determine timezones for email formatting
        const customerTimezone = bookingData.customerTimezone || businessUser.timezone || 'Etc/UTC';
        const businessTimezone = businessUser.timezone || 'Etc/UTC';

        // Format dates for customer email (in customer's timezone)
        const customerEmailData = {
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          businessName: businessUser.businessName || 'My Business',
          businessEmail: businessUser.email,
          appointmentDate: formatDateForEmail(appointmentDate, customerTimezone),
          appointmentTime: formatTimeForEmail(appointmentDate, customerTimezone),
          appointmentType: emailAppointmentType.name,
          appointmentDuration: emailAppointmentType.duration,
          businessColors: branding ? {
            primary: branding.primary,
            secondary: branding.secondary,
            accent: branding.accent
          } : undefined,
          businessLogo: branding?.logoUrl,
          usePlatformBranding: branding?.usePlatformBranding || true,
          bookingUrl: eventUrl
        };

        // Format dates for business email (in business user's timezone)
        const businessEmailData = {
          ...customerEmailData,
          appointmentDate: formatDateForEmail(appointmentDate, businessTimezone),
          appointmentTime: formatTimeForEmail(appointmentDate, businessTimezone),
        };

        // Send emails asynchronously - don't block the response
        console.log('Sending email with bookingUrl:', customerEmailData.bookingUrl);
        Promise.all([
          sendCustomerConfirmation(customerEmailData),
          sendBusinessNotification(businessEmailData)
        ]).then(() => {
          console.log('Booking confirmation emails sent successfully');
        }).catch(error => {
          console.error('Failed to send booking emails:', error);
        });

        // Create notification for business owner
        try {
          await storage.createNotification({
            userId: businessUser._id,
            title: 'New Booking',
            message: `${bookingData.customerName} has scheduled ${emailAppointmentType.name}`,
            type: 'scheduled',
            relatedBookingId: booking._id,
            customerName: bookingData.customerName,
            serviceName: emailAppointmentType.name,
            appointmentDate: appointmentDate.getTime(),
          });
          console.log(`✅ Notification created for new booking`);
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
          // Don't fail the booking if notification creation fails
        }

        // Create Google Calendar event and store the event ID
        googleCalendarService.createCalendarEvent(businessUser._id, {
          summary: `${emailAppointmentType.name} - ${bookingData.customerName}`,
          description: `Appointment with ${bookingData.customerName} (${bookingData.customerEmail})\n\nService: ${emailAppointmentType.name}\nDuration: ${emailAppointmentType.duration} minutes`,
          start: appointmentDate,
          end: new Date(appointmentDate.getTime() + (emailAppointmentType.duration || 30) * 60 * 1000),
          // Don't add attendees - we send our own confirmation email
        }).then(async (result) => {
          // Update booking with Google Calendar event ID
          if (result.success && result.eventId && booking._id) {
            try {
              await storage.updateBooking(booking._id, { googleCalendarEventId: result.eventId });
              console.log(`✅ Google Calendar event created and linked to booking: ${result.eventId}`);
            } catch (error) {
              console.error('Failed to update booking with Google Calendar event ID:', error);
            }
          }
        }).catch(error => {
          console.log('Google Calendar integration not connected or failed:', error.message);
        });
      }
      
      res.json({ message: "Booking created successfully", booking });
    } catch (error) {
      console.error("POST /api/public-bookings - Error:", error);
      res.status(400).json({ message: "Invalid booking data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // PUBLIC route to get booking details by token (no authentication required)
  app.get("/api/public/booking/:token", async (req, res) => {
    try {
      const booking = await storage.getBookingByToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get related data for public display
      const user = await storage.getUser(booking.userId);
      if (!booking.appointmentTypeId) {
        return res.status(400).json({ message: "Booking missing appointment type" });
      }
      const appointmentType = await storage.getAppointmentType(booking.appointmentTypeId);
      const branding = await storage.getBranding(booking.userId);

      if (!user || !appointmentType) {
        return res.status(404).json({ message: "Booking data incomplete" });
      }

      // Mask customer email for privacy (show first char and domain only)
      const maskedEmail = booking.customerEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
        return first + '*'.repeat(Math.min(middle.length, 8)) + domain;
      });

      // Return public booking details (without sensitive data)
      const publicBookingDetails = {
        id: booking._id,
        customerName: booking.customerName,
        customerEmail: maskedEmail, // Masked for privacy
        appointmentDate: booking.appointmentDate,
        appointmentType: {
          name: appointmentType.name,
          description: appointmentType.description,
          duration: appointmentType.duration,
        },
        status: booking.status,
        // notes intentionally omitted - may contain sensitive info
        business: {
          name: user.businessName || user.name,
          primaryColor: branding?.primary || '#0053F1',
          secondaryColor: branding?.secondary || '#64748B',
          accentColor: branding?.accent || '#121212',
          logo: branding?.logoUrl,
          timezone: user.timezone,
        }
      };

      res.json(publicBookingDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      // SECURITY: Require authentication and only return user's own bookings
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const includeDeleted = req.query.includeDeleted === 'true';
      const allBookings = await storage.getBookingsByUser(session.userId);
      // Filter out deleted bookings unless explicitly included
      const bookings = includeDeleted
        ? allBookings
        : allBookings.filter((booking: any) => booking.status !== 'deleted');
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      // SECURITY: Require authentication for booking details
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // SECURITY: Only return booking if it belongs to the authenticated user  
      if (booking.userId !== session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get form submission for a booking
  app.get("/api/bookings/:id/form-submission", async (req, res) => {
    try {
      // SECURITY: Require authentication
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // SECURITY: Verify ownership
      if (booking.userId !== session.userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Get form submission
      const formSubmission = await storage.getFormSubmissionByBooking(req.params.id);
      
      if (!formSubmission) {
        return res.status(404).json({ message: "Form submission not found" });
      }

      // Get the intake form details
      const intakeForm = await storage.getIntakeFormById(formSubmission.intakeFormId);
      
      res.json({
        ...formSubmission,
        intakeForm,
      });
    } catch (error) {
      console.error("Error fetching form submission:", error);
      res.status(500).json({ message: "Failed to fetch form submission" });
    }
  });

  // Download form submission as PDF/ZIP
  app.get("/api/bookings/:id/form-submission/download", async (req, res) => {
    try {
      // SECURITY: Require authentication
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // SECURITY: Verify ownership
      if (booking.userId !== session.userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Get form submission
      const formSubmission = await storage.getFormSubmissionByBooking(req.params.id);
      
      if (!formSubmission) {
        return res.status(404).json({ message: "Form submission not found" });
      }

      // Get the intake form details
      const intakeForm = await storage.getIntakeFormById(formSubmission.intakeFormId);
      
      if (!intakeForm) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Collect all file URLs from responses
      const fileUrls: string[] = [];
      formSubmission.responses?.forEach((response: any) => {
        if (response.fileUrls && Array.isArray(response.fileUrls)) {
          fileUrls.push(...response.fileUrls);
        }
      });

      const hasFiles = fileUrls.length > 0;

      // Helper function to format answer value based on field type
      const formatAnswer = (field: any, response: any): string => {
        if (!response || response.answer === null || response.answer === undefined) {
          return 'Not provided';
        }

        const answerValue = response.answer;

        if (field.type === 'checkbox') {
          return answerValue ? 'Yes' : 'No';
        } else if (field.type === 'checkbox-list') {
          const listValue = Array.isArray(answerValue)
            ? answerValue
            : (answerValue ? [answerValue] : []);
          return listValue.length > 0 ? listValue.join(', ') : 'Not provided';
        } else if (field.type === 'yes-no') {
          return answerValue
            ? String(answerValue).charAt(0).toUpperCase() + String(answerValue).slice(1).toLowerCase()
            : 'Not provided';
        } else if (field.type === 'file' || field.type === 'file-upload') {
          if (response.fileUrls && response.fileUrls.length > 0) {
            // Return filenames only (will be rendered separately)
            return response.fileUrls.map((url: string) => url.split('/').pop() || 'file').join('\n');
          }
          return 'No file uploaded';
        } else {
          return answerValue ? String(answerValue) : 'Not provided';
        }
      };

      // Generate PDF with proper formatting matching the modal
      const generatePDF = (): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
          const doc = new PDFDocument({ margin: 50, size: 'A4' });
          const pdfChunks: Buffer[] = [];

          doc.on('data', (chunk) => pdfChunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(pdfChunks)));
          doc.on('error', reject);

          try {
            // RGB Color constants (matching modal CSS)
            const COLOR_TEXT = [18, 18, 18];           // #121212
            const COLOR_SECONDARY = [100, 116, 139];   // #64748B
            const COLOR_MUTED = [148, 163, 184];       // #94A3B8

            // Title (22px, bold, black)
            doc.fontSize(22)
               .font('Helvetica-Bold')
               .fillColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2])
               .text(intakeForm.name || 'Untitled Form');

            // Description (14px, normal, gray) - only if exists
            if (intakeForm.description) {
              doc.moveDown(0.5);
              doc.fontSize(14)
                 .font('Helvetica')
                 .fillColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2])
                 .text(intakeForm.description);
            }

            // Space before questions (28px gap equivalent)
            doc.moveDown(1.5);

            // Process ALL fields (not just answered ones)
            if (intakeForm.fields && intakeForm.fields.length > 0) {
              intakeForm.fields.forEach((field: any, index: number) => {
                const questionText = field.question || field.label || field.title || `Question ${index + 1}`;
                const response = formSubmission.responses?.find((r: any) => r.fieldId === field.id);
                const answerText = formatAnswer(field, response);

                // Question (14px, bold, black)
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .fillColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2])
                   .text(questionText);

                // Small gap between question and answer
                doc.moveDown(0.3);

                // Answer (14px, normal, gray or muted if not provided)
                const isNotProvided = answerText === 'Not provided' || answerText === 'No file uploaded';
                const answerColor = isNotProvided ? COLOR_MUTED : COLOR_SECONDARY;

                doc.fontSize(14)
                   .font('Helvetica')
                   .fillColor(answerColor[0], answerColor[1], answerColor[2])
                   .text(answerText);

                // Gap between fields (20px equivalent)
                doc.moveDown(1);
              });
            }

            // Finalize PDF
            doc.end();
          } catch (error) {
            console.error('Error in PDF generation:', error);
            reject(error);
          }
        });
      };

      // Download files from Digital Ocean and create ZIP
      const createZipWithFiles = async (pdfBuffer: Buffer): Promise<Buffer> => {
        console.log(`Starting file downloads for ${fileUrls.length} files...`);
        const downloadedFiles: Array<{ buffer: Buffer; name: string }> = [];

        // Download all files sequentially
        for (const fileUrl of fileUrls) {
          try {
            console.log(`Downloading: ${fileUrl}`);
            const response = await fetch(fileUrl);

            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const fileName = fileUrl.split('/').pop() || 'file';

              downloadedFiles.push({ buffer, name: fileName });
              console.log(`✓ Downloaded: ${fileName} (${buffer.length} bytes)`);
            } else {
              console.error(`✗ Failed to download ${fileUrl}: HTTP ${response.status}`);
            }
          } catch (error) {
            console.error(`✗ Error downloading ${fileUrl}:`, error);
          }
        }

        console.log(`Downloaded ${downloadedFiles.length} of ${fileUrls.length} files`);

        // Create ZIP archive
        return new Promise((resolve, reject) => {
          const archive = archiver('zip', { zlib: { level: 9 } });
          const chunks: Buffer[] = [];

          archive.on('data', (chunk) => chunks.push(chunk));
          archive.on('end', () => {
            const zipBuffer = Buffer.concat(chunks);
            console.log(`✓ ZIP created: ${zipBuffer.length} bytes`);
            resolve(zipBuffer);
          });
          archive.on('error', (err) => {
            console.error('✗ ZIP creation error:', err);
            reject(err);
          });

          // Add PDF to ZIP
          const pdfName = `${intakeForm.name || 'form'}.pdf`;
          archive.append(pdfBuffer, { name: pdfName });
          console.log(`Added to ZIP: ${pdfName} (${pdfBuffer.length} bytes)`);

          // Add all downloaded files to ZIP
          downloadedFiles.forEach(({ buffer, name }) => {
            archive.append(buffer, { name });
            console.log(`Added to ZIP: ${name} (${buffer.length} bytes)`);
          });

          // Finalize archive
          console.log('Finalizing ZIP archive...');
          archive.finalize();
        });
      };

      try {
        console.log('Starting form submission download...');
        console.log(`Form: ${intakeForm.name}, Files: ${fileUrls.length}`);

        // Generate PDF
        const pdfBuffer = await generatePDF();
        console.log(`✓ PDF generated: ${pdfBuffer.length} bytes`);

        if (hasFiles) {
          // Create ZIP with PDF and files
          const zipBuffer = await createZipWithFiles(pdfBuffer);
          const fileName = `${intakeForm.name || 'form'}-${new Date(formSubmission.submittedAt).toISOString().split('T')[0]}.zip`;

          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Length', zipBuffer.length.toString());
          res.send(zipBuffer);

          console.log(`✓ ZIP download sent: ${fileName} (${zipBuffer.length} bytes)`);
        } else {
          // Send PDF only
          const fileName = `${intakeForm.name || 'form'}-${new Date(formSubmission.submittedAt).toISOString().split('T')[0]}.pdf`;

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          res.send(pdfBuffer);

          console.log(`✓ PDF download sent: ${fileName} (${pdfBuffer.length} bytes)`);
        }
      } catch (error) {
        console.error('✗ Error in download endpoint:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to generate download" });
        }
      }
    } catch (error) {
      console.error("Error downloading form submission:", error);
      res.status(500).json({ message: "Failed to download form submission" });
    }
  });

  // Public endpoint to fetch booking by token (for event page)
  app.get("/api/bookings/token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const booking = await storage.getBookingByToken(token);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Fetch user (business owner) details
      const user = await storage.getUser(booking.userId);
      if (!user) {
        return res.status(404).json({ message: "Business owner not found" });
      }

      // Fetch appointment type details
      let appointmentType = null;
      if (booking.appointmentTypeId) {
        appointmentType = await storage.getAppointmentType(booking.appointmentTypeId);
      }

      // Fetch branding for business colors/logo
      let branding = await storage.getBranding(booking.userId);

      // Return combined data
      res.json({
        booking,
        user: {
          _id: user._id,
          name: user.name,
          businessName: user.businessName,
          timezone: user.timezone,
        },
        appointmentType,
        branding
      });
    } catch (error) {
      console.error('Error fetching booking by token:', error);
      res.status(500).json({ message: "Failed to fetch booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Public endpoint to reschedule a booking by token
  app.post("/api/bookings/reschedule/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { appointmentTypeId, appointmentDate, customerTimezone } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      if (!appointmentTypeId || !appointmentDate || !customerTimezone) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the existing booking
      const existingBooking = await storage.getBookingByToken(token);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Fetch user (business owner) details
      const user = await storage.getUser(existingBooking.userId);
      if (!user) {
        return res.status(404).json({ message: "Business owner not found" });
      }

      // Fetch appointment type
      const appointmentType = await storage.getAppointmentType(appointmentTypeId);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }

      // Validate the new time slot is available
      const newDate = new Date(appointmentDate);
      const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;

      // Use the availability service to check if slot is available
      const { getAvailableSlots } = await import("./services/availability");
      const availableSlots = await getAvailableSlots({
        userId: user._id,
        appointmentTypeId,
        date: newDateStr,
        customerTimezone,
        excludeBookingId: existingBooking._id // Exclude current booking when checking availability
      });

      // Check if the requested slot is in the available slots
      const requestedTimestamp = new Date(appointmentDate).getTime();
      const isSlotAvailable = availableSlots.some(slot => {
        const slotTime = new Date(slot).getTime();
        return slotTime === requestedTimestamp;
      });

      if (!isSlotAvailable) {
        return res.status(400).json({ message: "The selected time slot is no longer available" });
      }

      // IMPORTANT: Update the EXISTING booking in Convex (NOT creating a new one)
      // This ensures no duplicates in the database or UI
      console.log(`🔄 Rescheduling booking ${existingBooking._id} from ${new Date(existingBooking.appointmentDate).toISOString()} to ${new Date(requestedTimestamp).toISOString()}`);

      const updatedBooking = await storage.updateBooking(existingBooking._id, {
        appointmentTypeId,
        appointmentDate: requestedTimestamp,
        customerTimezone,
        duration: appointmentType.duration
      });

      if (!updatedBooking) {
        return res.status(500).json({ message: "Failed to update booking" });
      }

      console.log(`✅ Booking ${existingBooking._id} updated successfully in database - OLD entry replaced, no duplicate created`);

      // IMPORTANT: Update the EXISTING Google Calendar event (NOT creating a new one)
      // This ensures no duplicates in Google Calendar
      if (existingBooking.googleCalendarEventId) {
        try {
          console.log(`🔄 Updating Google Calendar event ${existingBooking.googleCalendarEventId}`);

          const appointmentEnd = new Date(requestedTimestamp + appointmentType.duration * 60 * 1000);
          const updateResult = await googleCalendarService.updateCalendarEvent(
            user._id,
            existingBooking.googleCalendarEventId,
            {
              summary: `${appointmentType.name} - ${existingBooking.customerName}`,
              description: `Rescheduled appointment\n\nCustomer: ${existingBooking.customerName}\nEmail: ${existingBooking.customerEmail}${existingBooking.notes ? `\n\nNotes: ${existingBooking.notes}` : ''}`,
              start: new Date(requestedTimestamp),
              end: appointmentEnd,
            }
          );

          if (updateResult.success) {
            console.log(`✅ Google Calendar event ${existingBooking.googleCalendarEventId} updated successfully - OLD event replaced, no duplicate created`);
          } else {
            console.warn(`⚠️ Google Calendar update failed but continuing: ${JSON.stringify(updateResult)}`);
          }
        } catch (error) {
          console.error('❌ Error updating Google Calendar event:', error);
          // Don't fail the reschedule if Google Calendar update fails
        }
      } else {
        console.log(`ℹ️ No Google Calendar event to update (googleCalendarEventId not set)`);
      }

      // Send email notifications about reschedule
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const bookingUrl = `${frontendUrl}/event/${updatedBooking.bookingToken}`;

        const branding = await storage.getBranding(user._id);
        const businessColors = branding ? {
          primary: branding.primary,
          secondary: branding.secondary,
          accent: branding.accent,
        } : undefined;

        // Use customer's timezone for customer email, fallback to business timezone
        const customerTimezone = updatedBooking.customerTimezone || user.timezone || 'Etc/UTC';

        await sendRescheduleConfirmation({
          customerName: updatedBooking.customerName,
          customerEmail: updatedBooking.customerEmail,
          businessName: user.businessName || user.name || 'DayWise',
          businessEmail: user.email,
          appointmentDate: formatDateForEmail(updatedBooking.appointmentDate, customerTimezone),
          appointmentTime: formatTimeForEmail(updatedBooking.appointmentDate, customerTimezone),
          appointmentType: appointmentType.name,
          appointmentDuration: appointmentType.duration,
          businessColors,
          businessLogo: branding?.logoUrl,
          usePlatformBranding: branding?.usePlatformBranding,
          bookingUrl,
          oldAppointmentDate: formatDateForEmail(existingBooking.appointmentDate, customerTimezone),
          oldAppointmentTime: formatTimeForEmail(existingBooking.appointmentDate, customerTimezone),
        });
        console.log(`✅ Reschedule confirmation email sent to ${existingBooking.customerEmail}`);
      } catch (emailError) {
        console.error('Error sending reschedule email:', emailError);
        // Don't fail the reschedule if email fails
      }

      // Create notification for business owner
      try {
        await storage.createNotification({
          userId: user._id,
          title: 'Booking Rescheduled',
          message: `${updatedBooking.customerName} has rescheduled ${appointmentType.name}`,
          type: 'rescheduled',
          relatedBookingId: updatedBooking._id,
          customerName: updatedBooking.customerName,
          serviceName: appointmentType.name,
          appointmentDate: updatedBooking.appointmentDate,
        });
        console.log(`✅ Notification created for rescheduled booking`);
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the reschedule if notification creation fails
      }

      res.json({
        message: "Booking rescheduled successfully",
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      res.status(500).json({ message: "Failed to reschedule booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Public endpoint to cancel a booking by token
  app.post("/api/bookings/cancel/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      // Fetch the existing booking
      const existingBooking = await storage.getBookingByToken(token);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if booking is already cancelled
      if (existingBooking.status === 'cancelled') {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      // Fetch user (business owner) details
      const user = await storage.getUser(existingBooking.userId);
      if (!user) {
        return res.status(404).json({ message: "Business owner not found" });
      }

      // Fetch appointment type
      let appointmentType = null;
      if (existingBooking.appointmentTypeId) {
        appointmentType = await storage.getAppointmentType(existingBooking.appointmentTypeId);
      }

      // Fetch branding for emails
      const branding = await storage.getBranding(existingBooking.userId);
      const businessColors = branding ? {
        primary: branding.primary || '#0053F1',
        secondary: branding.secondary || '#64748B',
        accent: branding.accent || '#121212',
      } : undefined;

      // Delete Google Calendar event if it exists
      if (existingBooking.googleCalendarEventId) {
        try {
          await googleCalendarService.deleteCalendarEvent(
            existingBooking.userId,
            existingBooking.googleCalendarEventId
          );
          console.log(`✅ Google Calendar event deleted: ${existingBooking.googleCalendarEventId}`);
        } catch (error) {
          console.error('Failed to delete Google Calendar event:', error);
          // Continue with cancellation even if calendar deletion fails
        }
      }

      // Update booking status to "cancelled" instead of deleting
      await storage.updateBooking(existingBooking._id, { 
        status: 'cancelled',
        googleCalendarEventId: undefined // Clear calendar event ID since event is deleted
      });
      console.log(`✅ Booking ${existingBooking._id} marked as cancelled`);

      // Send cancellation confirmation emails
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const bookingUrl = `${frontendUrl}/event/${existingBooking.bookingToken}`;

        // Format appointment date and time in customer's timezone
        const customerTimezone = existingBooking.customerTimezone || user.timezone || 'UTC';
        const appointmentDate = dayjs.utc(existingBooking.appointmentDate).tz(customerTimezone);
        
        await sendCancellationConfirmation({
          customerName: existingBooking.customerName,
          customerEmail: existingBooking.customerEmail,
          businessName: user.businessName || user.name || 'DayWise',
          businessEmail: user.email,
          appointmentDate: appointmentDate.format('MMMM D, YYYY'),
          appointmentTime: appointmentDate.format('h:mm A'),
          appointmentType: appointmentType?.name || 'Appointment',
          appointmentDuration: appointmentType?.duration || existingBooking.duration || 30,
          businessColors,
          businessLogo: branding?.logoUrl,
          usePlatformBranding: branding?.usePlatformBranding,
          bookingUrl,
        });
        console.log(`✅ Cancellation confirmation email sent to ${existingBooking.customerEmail}`);

        // Send business notification
        await sendCancellationBusinessNotification({
          customerName: existingBooking.customerName,
          customerEmail: existingBooking.customerEmail,
          businessName: user.businessName || user.name || 'DayWise',
          businessEmail: user.email,
          appointmentDate: appointmentDate.format('MMMM D, YYYY'),
          appointmentTime: appointmentDate.format('h:mm A'),
          appointmentType: appointmentType?.name || 'Appointment',
          appointmentDuration: appointmentType?.duration || existingBooking.duration || 30,
          businessColors,
          businessLogo: branding?.logoUrl,
          usePlatformBranding: branding?.usePlatformBranding,
          bookingUrl,
        });
        console.log(`✅ Cancellation notification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Don't fail the cancellation if email fails
      }

      // Create notification for business owner
      try {
        await storage.createNotification({
          userId: user._id,
          title: 'Booking Cancelled',
          message: `${existingBooking.customerName} has cancelled ${appointmentType?.name || 'Appointment'}`,
          type: 'cancelled',
          relatedBookingId: existingBooking._id,
          customerName: existingBooking.customerName,
          serviceName: appointmentType?.name || 'Appointment',
          appointmentDate: existingBooking.appointmentDate,
        });
        console.log(`✅ Notification created for cancelled booking`);
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the cancellation if notification creation fails
      }

      // Return booking data before deletion for confirmation page
      res.json({
        message: "Booking cancelled successfully",
        booking: {
          customerName: existingBooking.customerName,
          customerEmail: existingBooking.customerEmail,
          appointmentDate: existingBooking.appointmentDate,
          customerTimezone: existingBooking.customerTimezone,
          bookingToken: existingBooking.bookingToken,
          appointmentTypeId: existingBooking.appointmentTypeId,
          duration: existingBooking.duration,
        },
        user: {
          _id: user._id,
          id: user._id,
          slug: user.slug,
          businessName: user.businessName || user.name,
        },
        appointmentType: appointmentType ? {
          _id: appointmentType._id,
          name: appointmentType.name,
          duration: appointmentType.duration,
          price: appointmentType.price,
        } : null,
        branding: branding ? {
          primary: branding.primary,
          secondary: branding.secondary,
          accent: branding.accent,
          logoUrl: branding.logoUrl,
          usePlatformBranding: branding.usePlatformBranding,
        } : null,
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ message: "Failed to cancel booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      // SECURITY: Require authentication for booking updates
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // SECURITY: Verify booking exists and ownership before update
      const existingBooking = await storage.getBooking(req.params.id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (existingBooking.userId !== session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = req.body;
      const booking = await storage.updateBooking(req.params.id, updates);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found after update" });
      }

      // Update Google Calendar event if it exists, or create one if calendar is now connected
      if (existingBooking.googleCalendarEventId) {
        try {
          // If cancelled, delete the Google Calendar event
          if (booking.status === 'cancelled' && existingBooking.status !== 'cancelled') {
            const deleteResult = await googleCalendarService.deleteCalendarEvent(session.userId, existingBooking.googleCalendarEventId);
            if (deleteResult.success) {
              console.log(`✅ Google Calendar event deleted: ${existingBooking.googleCalendarEventId}`);
              // Clear the googleCalendarEventId from booking
              await storage.updateBooking(req.params.id, { googleCalendarEventId: undefined });
            }
          }
          // Update the Google Calendar event if any booking details changed
          else if (
            existingBooking.appointmentDate !== booking.appointmentDate ||
            existingBooking.customerName !== booking.customerName ||
            existingBooking.customerEmail !== booking.customerEmail ||
            existingBooking.duration !== booking.duration ||
            existingBooking.appointmentTypeId !== booking.appointmentTypeId
          ) {
            const appointmentDateObj = new Date(booking.appointmentDate);
            const appointmentEnd = new Date(appointmentDateObj.getTime() + (booking.duration || 30) * 60 * 1000);
            
            // Get appointment type name for Google Calendar event
            let appointmentTypeName = 'Appointment';
            if (booking.appointmentTypeId) {
              try {
                const appointmentType = await storage.getAppointmentType(booking.appointmentTypeId);
                if (appointmentType) {
                  appointmentTypeName = appointmentType.name;
                }
              } catch (error) {
                console.error('Failed to fetch appointment type for Google Calendar update:', error);
              }
            }
            
            const updateResult = await googleCalendarService.updateCalendarEvent(session.userId, existingBooking.googleCalendarEventId, {
              start: appointmentDateObj,
              end: appointmentEnd,
              summary: `${appointmentTypeName} with ${booking.customerName}`,
              description: `${appointmentTypeName} with ${booking.customerName} (${booking.customerEmail})`,
              attendees: [booking.customerEmail]
            });
            
            if (updateResult.success) {
              console.log(`✅ Google Calendar event updated: ${existingBooking.googleCalendarEventId}`);
            } else if (updateResult.notFound) {
              // Event was deleted from Google Calendar - clear the ID and try to create a new one
              console.log('⚠️ Calendar event not found (deleted by user), creating new event');
              await storage.updateBooking(req.params.id, { googleCalendarEventId: undefined });
              
              // Create new calendar event
              const customEventId = `daywise_${booking._id}`.replace(/[^a-v0-9]/g, '').substring(0, 64);
              const createResult = await googleCalendarService.createCalendarEvent(session.userId, {
                summary: `Appointment - ${booking.customerName}`,
                description: `Appointment with ${booking.customerName} (${booking.customerEmail})`,
                start: appointmentDateObj,
                end: appointmentEnd,
                attendees: [booking.customerEmail],
                customEventId: customEventId,
              });
              
              if (createResult.success && createResult.eventId) {
                await storage.updateBooking(req.params.id, { googleCalendarEventId: createResult.eventId });
                console.log(`✅ New Google Calendar event created: ${createResult.eventId}`);
              }
            }
          }
        } catch (calendarError) {
          console.error('Failed to update Google Calendar event:', calendarError);
          // Don't fail the booking update if calendar sync fails
        }
      } else {
        // No existing calendar event - check if calendar is now connected and create one
        try {
          const appointmentDateObj = new Date(booking.appointmentDate);
          const appointmentEnd = new Date(appointmentDateObj.getTime() + (booking.duration || 30) * 60 * 1000);
          const customEventId = `daywise_${booking._id}`.replace(/[^a-v0-9]/g, '').substring(0, 64);
          
          const result = await googleCalendarService.createCalendarEvent(session.userId, {
            summary: `Appointment - ${booking.customerName}`,
            description: `Appointment with ${booking.customerName} (${booking.customerEmail})`,
            start: appointmentDateObj,
            end: appointmentEnd,
            attendees: [booking.customerEmail],
            customEventId: customEventId,
          });
          
          if (result.success && result.eventId) {
            await storage.updateBooking(req.params.id, { googleCalendarEventId: result.eventId });
            console.log(`✅ Google Calendar event created during update: ${result.eventId}`);
          }
        } catch (calendarError) {
          console.log('Google Calendar not connected or creation failed during update:', calendarError);
          // This is fine - user might not have calendar connected
        }
      }
      
      console.log(`PUT /api/bookings/${req.params.id} - Update completed, sending response`);
      
      // Send email notifications based on status change
      try {
        const user = await storage.getUser(booking.userId);
        
        // Only send emails if we have an appointment type (skip for internal bookings without appointment type)
        if (booking.appointmentTypeId) {
          console.log(`PUT /api/bookings/${req.params.id} - Has appointmentTypeId, preparing email notifications`);
          const appointmentType = await storage.getAppointmentType(booking.appointmentTypeId);
          const branding = await storage.getBranding(booking.userId);
          const userFeatures = await getUserFeatures(booking.userId);
          
          if (user && appointmentType) {
            // Determine timezones for email formatting
            const customerTimezone = booking.customerTimezone || user.timezone || 'Etc/UTC';
            const businessTimezone = user.timezone || 'Etc/UTC';

            // Base email data (timezone-independent fields)
            const baseEmailData = {
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              businessName: user.businessName || user.name,
              businessEmail: user.email,
              appointmentType: appointmentType.name,
              appointmentDuration: appointmentType.duration,
              businessColors: branding ? {
                primary: branding.primary,
                secondary: branding.secondary,
                accent: branding.accent
              } : undefined,
              businessLogo: branding?.logoUrl,
              usePlatformBranding: userFeatures?.poweredBy || false,
            };

            // Customer email data (formatted in customer's timezone)
            const customerEmailData = {
              ...baseEmailData,
              appointmentDate: formatDateForEmail(booking.appointmentDate, customerTimezone),
              appointmentTime: formatTimeForEmail(booking.appointmentDate, customerTimezone),
            };

            // Business email data (formatted in business user's timezone)
            const businessEmailData = {
              ...baseEmailData,
              appointmentDate: formatDateForEmail(booking.appointmentDate, businessTimezone),
              appointmentTime: formatTimeForEmail(booking.appointmentDate, businessTimezone),
            };

          // Check if booking was cancelled by business
          if (existingBooking.status !== 'cancelled' && booking.status === 'cancelled') {
            // Send email to customer when business cancels
            await sendBusinessCancellationConfirmation(customerEmailData);
            // Send notification to business owner
            await sendCancellationBusinessNotification(businessEmailData);
          }
          // Check if booking was rescheduled (date/time changed)
          else if (existingBooking.appointmentDate !== booking.appointmentDate) {
            const oldCustomerEmailData = {
              ...customerEmailData,
              oldAppointmentDate: formatDateForEmail(existingBooking.appointmentDate, customerTimezone),
              oldAppointmentTime: formatTimeForEmail(existingBooking.appointmentDate, customerTimezone),
            };
            const oldBusinessEmailData = {
              ...businessEmailData,
              oldAppointmentDate: formatDateForEmail(existingBooking.appointmentDate, businessTimezone),
              oldAppointmentTime: formatTimeForEmail(existingBooking.appointmentDate, businessTimezone),
            };
            await sendRescheduleConfirmation(oldCustomerEmailData);
            await sendRescheduleBusinessNotification(oldBusinessEmailData);
          }
        }
        } else {
          console.log(`PUT /api/bookings/${req.params.id} - No appointmentTypeId, skipping email notifications`);
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the booking update if email fails
      }
      
      console.log(`PUT /api/bookings/${req.params.id} - Sending success response`);
      res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      // SECURITY: Require authentication for booking deletion
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // SECURITY: Verify booking exists and ownership before deletion
      const existingBooking = await storage.getBooking(req.params.id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (existingBooking.userId !== session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete Google Calendar event if it exists
      if (existingBooking.googleCalendarEventId) {
        try {
          await googleCalendarService.deleteCalendarEvent(
            existingBooking.userId,
            existingBooking.googleCalendarEventId
          );
          console.log(`✅ Google Calendar event deleted: ${existingBooking.googleCalendarEventId}`);
        } catch (error) {
          console.error('Failed to delete Google Calendar event:', error);
          // Continue with booking deletion even if calendar deletion fails
        }
      }

      // Delete intake form submission files if they exist
      try {
        const formSubmissionResult = await storage.deleteFormSubmissionByBooking(req.params.id);
        if (formSubmissionResult.fileUrls && formSubmissionResult.fileUrls.length > 0) {
          const { deleteMultipleFiles } = await import("./services/spaces");
          await deleteMultipleFiles(formSubmissionResult.fileUrls);
          console.log(`✅ Deleted ${formSubmissionResult.fileUrls.length} intake form files`);
        }
      } catch (error) {
        console.error('Failed to delete intake form files:', error);
        // Continue with booking deletion even if file deletion fails
      }

      // Update booking status to "deleted" instead of deleting
      const updatedBooking = await storage.updateBooking(req.params.id, { 
        status: 'deleted',
        googleCalendarEventId: undefined // Clear calendar event ID since event is deleted
      });
      
      if (!updatedBooking) {
        return res.status(500).json({ message: "Failed to update booking status" });
      }
      
      console.log(`✅ Booking ${req.params.id} marked as deleted`);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Availability routes
  app.post("/api/availability", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Use session userId instead of request body to prevent unauthorized access
      const availabilityData = insertAvailabilitySchema.parse({
        ...req.body,
        userId: session.userId
      });
      const availability = await storage.createAvailability(availabilityData);
      res.json({ message: "Availability created successfully", availability });
    } catch (error) {
      res.status(400).json({ message: "Invalid availability data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Bulk update weekly availability
  app.put("/api/availability/weekly", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { weeklySchedule } = req.body;
      if (!weeklySchedule || typeof weeklySchedule !== 'object') {
        return res.status(400).json({ message: "Weekly schedule is required" });
      }

      // Update weekly availability using the new bulk method
      const availability = await storage.updateWeeklyAvailability(session.userId, weeklySchedule);
      res.json({ 
        message: "Weekly availability updated successfully", 
        availability,
        count: availability.length 
      });
    } catch (error) {
      console.error("Error updating weekly availability:", error);
      res.status(500).json({ 
        message: "Failed to update weekly availability", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get available time slots for a specific date (MUST come before :userId route)
  app.get("/api/availability/slots", async (req, res) => {
    console.log(`=== SLOTS ENDPOINT CALLED ===`);
    console.log(`Raw query params:`, req.query);
    console.log(`Raw URL:`, req.url);
    try {
      const { userId, appointmentTypeId, date, customerTimezone, timezone = 'UTC' } = req.query;
      console.log(`GET /api/availability/slots - Parsed Params:`, { userId, appointmentTypeId, date, customerTimezone, timezone });
      
      if (!userId || !appointmentTypeId || !date) {
        console.log(`Missing required parameters:`, { userId, appointmentTypeId, date });
        return res.status(400).json({ 
          message: "Missing required parameters: userId, appointmentTypeId, and date are required" 
        });
      }

      // Check user's plan and enforce booking limit for public bookings (5 per month for free plan)
      const features = await getUserFeatures(userId as string);
      if (features.bookingLimit !== null) {
        // Get current bookings count for this user
        const existingBookings = await storage.getBookingsByUser(userId as string);
        
        // Filter bookings for current month (bookings made within this calendar month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthBookings = existingBookings.filter((booking: any) => {
          const bookingDate = new Date(booking.appointmentDate);
          return bookingDate.getMonth() === currentMonth && 
                 bookingDate.getFullYear() === currentYear;
        });
        
        const currentCount = currentMonthBookings.length;
        
        // If free plan user has reached the monthly limit (5 bookings), return no slots
        if (currentCount >= features.bookingLimit) {
          console.log(`User ${userId} has reached monthly booking limit (${currentCount}/${features.bookingLimit}), returning no slots`);
          return res.json([]); // Return empty array (no slots available)
        }
      }
      
      // Parse the date
      const requestDate = new Date(date as string);
      if (isNaN(requestDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get appointment type details
      const appointmentType = await storage.getAppointmentType(appointmentTypeId as string);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      
      // Get user's weekly availability
      const availability = await storage.getAvailabilityByUser(userId as string);
      console.log(`Found ${availability.length} availability records for user ${userId}:`, availability);
      
      // Get user's timezone and normalize to supported timezone
      const user = await storage.getUser(userId as string);
      const userTimezone = mapToSupportedTimezone(user?.timezone || 'Etc/UTC');
      const customerTz = mapToSupportedTimezone((customerTimezone as string) || userTimezone);

      console.log(`User timezone (normalized): ${userTimezone}`);
      console.log(`Customer timezone (normalized): ${customerTz}`);

      // Check if timezones are the same
      const timezonesMatch = userTimezone === customerTz;
      console.log(`Timezones match: ${timezonesMatch}`);
      
      // Parse the date in the customer's timezone
      const customerDateInCustomerTz = dayjs.tz(date as string, customerTz);

      // Convert to UTC
      const customerDateUTC = customerDateInCustomerTz.utc();

      // Now convert that UTC time to the user's timezone to determine what day of week it is for the business
      const dateInUserTz = customerDateUTC.tz(userTimezone);
      const dayOfWeek = dateInUserTz.day();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      console.log(`Customer date ${date} in ${customerTz} → UTC: ${customerDateUTC.format('YYYY-MM-DD HH:mm:ss')} → User's timezone (${userTimezone}): ${dateInUserTz.format('YYYY-MM-DD dddd')}, day ${dayOfWeek} (${dayName})`);
      
      // Check if customer's full day (00:00-23:59 in their TZ) spans multiple calendar days in business TZ
      const customerDayStart = customerDateInCustomerTz.startOf('day'); // 00:00 in customer TZ
      const customerDayEnd = customerDateInCustomerTz.endOf('day'); // 23:59:59 in customer TZ
      const dayStartInUserTz = customerDayStart.tz(userTimezone);
      const dayEndInUserTz = customerDayEnd.tz(userTimezone);
      const spansDifferentDays = dayStartInUserTz.format('YYYY-MM-DD') !== dayEndInUserTz.format('YYYY-MM-DD');

      console.log(`Customer's full day ${customerDayStart.format('YYYY-MM-DD HH:mm')} to ${customerDayEnd.format('YYYY-MM-DD HH:mm')} (${customerTz}) → Business TZ: ${dayStartInUserTz.format('YYYY-MM-DD HH:mm')} to ${dayEndInUserTz.format('YYYY-MM-DD HH:mm')} (${userTimezone}) - Spans different days: ${spansDifferentDays}`);

      // First, check availability for the current day
      let dayAvailability = availability.filter(slot => {
        const rawWeekday = slot.weekday || '';
        const wk = String(rawWeekday).toLowerCase().trim();
        const available = slot.isAvailable !== false;
        const matches = wk === dayName || wk === dayName.slice(0,3) || wk === String(dayOfWeek);
        return matches && available;
      });
      console.log(`Found ${dayAvailability.length} availability slots for ${dayName}:`, dayAvailability);

      // Only check adjacent days if the customer's day actually spans different calendar days in the business timezone
      // This handles cases where customer's selected day spans multiple days in the business's timezone
      if (dayAvailability.length === 0 && customerTimezone && spansDifferentDays) {
        // Check what the previous and next days are in the user's timezone
        // For example, if customer is in GMT+10 and selects Monday, and user is in IST,
        // the Monday in GMT+10 might be Sunday evening or Tuesday morning in IST
        const prevDayInUserTz = dateInUserTz.subtract(1, 'day');
        const nextDayInUserTz = dateInUserTz.add(1, 'day');
        
        const prevDayName = dayNames[prevDayInUserTz.day()];
        const nextDayName = dayNames[nextDayInUserTz.day()];
        
        console.log(`No availability for ${dayName}, checking adjacent days due to timezone difference: ${prevDayName} and ${nextDayName}`);
        
        dayAvailability = availability.filter(slot => {
          const rawWeekday = slot.weekday || '';
          const wk = String(rawWeekday).toLowerCase().trim();
          const available = slot.isAvailable !== false;
          
          const matchesPrev = wk === prevDayName || wk === prevDayName.slice(0,3);
          const matchesNext = wk === nextDayName || wk === nextDayName.slice(0,3);
          const matches = matchesPrev || matchesNext;
          
          if (matches) {
            if (matchesPrev) console.log(`Slot for ${rawWeekday} matches adjacent day ${prevDayName}`);
            if (matchesNext) console.log(`Slot for ${rawWeekday} matches adjacent day ${nextDayName}`);
          }
          
          return matches && available;
        });
        console.log(`Found ${dayAvailability.length} availability slots from adjacent days:`, dayAvailability);
      } else if (dayAvailability.length === 0) {
        console.log(`No availability for ${dayName}, returning empty slots (not checking adjacent days - customer's day doesn't span different calendar days in business timezone)`);
      }
      
      // Use the date in user's timezone for exception matching (not UTC)
      const dateStrInUserTz = dateInUserTz.format('YYYY-MM-DD');

      // CHECK: Closed Months - entire month unavailable
      const exceptions = await storage.getAvailabilityExceptionsByUser(userId as string);
      const closedMonthsExceptions = exceptions.filter(ex => ex.type === 'closed_months');
      const isMonthClosed = closedMonthsExceptions.some((exception: any) => {
        if (!exception.customSchedule) return false;
        try {
          const schedule = JSON.parse(exception.customSchedule);
          const exceptionMonth = schedule.month; // 0-11
          const exceptionYear = schedule.year;
          const requestMonth = dateInUserTz.month(); // 0-11
          const requestYear = dateInUserTz.year();
          return exceptionMonth === requestMonth && exceptionYear === requestYear;
        } catch {
          return false;
        }
      });
      
      if (isMonthClosed) {
        console.log(`Month ${dateInUserTz.format('MMMM YYYY')} is closed, returning no slots`);
        return res.json({ slots: [] });
      }

      // CHECK: Booking Window (blocked dates) - entire date range unavailable
      // Check in user's timezone to ensure proper date matching
      const blockedDates = await storage.getBlockedDatesByUser(userId as string);
      const isBlocked = blockedDates.some((blocked: any) => {
        // Convert blocked dates to user's timezone for comparison
        const blockStart = dayjs(blocked.startDate).tz(userTimezone).startOf('day');
        const blockEnd = dayjs(blocked.endDate).tz(userTimezone).endOf('day');
        const dateStart = dateInUserTz.startOf('day');
        const dateEnd = dateInUserTz.endOf('day');
        
        // Check if the requested date overlaps with the blocked date range
        return dateStart.isBefore(blockEnd) && dateEnd.isAfter(blockStart);
      });
      
      if (isBlocked) {
        console.log(`Date ${dateStrInUserTz} is blocked by booking window, returning no slots`);
        return res.json({ slots: [] });
      }

      // Check for exceptions on this specific date (before checking dayAvailability)
      // Note: exceptions already fetched above for closed months check

      // Find all exceptions for this date
      const dateExceptions = exceptions.filter(exception => {
        const exceptionDateInUserTz = dayjs.tz(exception.date, userTimezone).format('YYYY-MM-DD');
        return exceptionDateInUserTz === dateStrInUserTz;
      });

      // Check for unavailable exception (applies to all services)
      const unavailableException = dateExceptions.find(exception => exception.type === 'unavailable');
      if (unavailableException) {
        // Check if it's service-specific
        if (!unavailableException.appointmentTypeId || unavailableException.appointmentTypeId === appointmentTypeId) {
          return res.json({ slots: [] });
        }
      }

      // Check for special_availability exception (service-specific)
      // Priority: special_availability for this service > custom_hours (all services) > week hours
      const specialAvailabilityException = dateExceptions.find(exception => {
        if (exception.type !== 'special_availability') return false;
        // Applies if: no appointmentTypeId (all services) OR matches requested appointmentTypeId
        const applies = !exception.appointmentTypeId || exception.appointmentTypeId === appointmentTypeId;
        if (applies) {
          console.log(`Found special_availability exception for ${dateStrInUserTz}:`, {
            appointmentTypeId: exception.appointmentTypeId,
            requestedAppointmentTypeId: appointmentTypeId,
            startTime: exception.startTime,
            endTime: exception.endTime
          });
        }
        return applies;
      });

      // Check for custom_hours exception (applies to all services, no appointmentTypeId)
      const customHoursException = dateExceptions.find(exception => 
        exception.type === 'custom_hours' && !exception.appointmentTypeId
      );

      // Determine which exception to use (priority: special_availability > custom_hours > week hours)
      const applicableException = specialAvailabilityException || customHoursException;
      
      console.log(`Exception check results:`, {
        hasSpecialAvailability: !!specialAvailabilityException,
        hasCustomHours: !!customHoursException,
        hasApplicableException: !!applicableException,
        applicableExceptionType: applicableException?.type,
        applicableExceptionStartTime: applicableException?.startTime,
        applicableExceptionEndTime: applicableException?.endTime
      });

      // Only check dayAvailability if we don't have an applicable exception
      // Exceptions override week hours, so we skip the dayAvailability check
      if (!applicableException && dayAvailability.length === 0) {
        console.log(`No availability for ${dayName}, returning empty slots`);
        return res.json({ slots: [] }); // No availability for this day
      }

      // Get existing bookings for this date to check for conflicts
      // Filter bookings that fall on the selected date in the user's timezone
      // Exclude cancelled and deleted bookings - they don't block time slots
      const allBookings = await storage.getBookingsByUser(userId as string);
      const dateBookings = allBookings.filter(booking => {
        // Only check active bookings (not cancelled or deleted)
        if (booking.status === 'cancelled' || booking.status === 'deleted') {
          return false;
        }
        // Convert booking UTC time to user's timezone and check if it's on the same date
        const bookingInUserTz = dayjs.utc(booking.appointmentDate).tz(userTimezone);
        const bookingDateStr = bookingInUserTz.format('YYYY-MM-DD');
        return bookingDateStr === dateStrInUserTz;
      });
      
      // Fetch appointment types for all existing bookings to get their buffer times
      const bookingAppointmentTypes = new Map();
      for (const booking of dateBookings) {
        if (booking.appointmentTypeId && !bookingAppointmentTypes.has(booking.appointmentTypeId)) {
          const apptType = await storage.getAppointmentType(booking.appointmentTypeId);
          if (apptType) {
            bookingAppointmentTypes.set(booking.appointmentTypeId, apptType);
          }
        }
      }
      
      // Generate time slots
      const slots: string[] = [];
      const appointmentDuration = appointmentType.duration || 30;
      const bufferTimeBefore = appointmentType.bufferTimeBefore || 0;
      const bufferTimeAfter = appointmentType.bufferTime || 0; // Legacy field name for "after"
      const totalSlotTime = appointmentDuration + bufferTimeAfter;
      
      console.log(`Slot generation params:`, {
        appointmentDuration,
        bufferTimeBefore,
        bufferTimeAfter,
        totalSlotTime,
        existingBookings: dateBookings.length,
        requestDateStr: dateStrInUserTz
      });
      
      // If exception exists, ignore week hours and use custom time range
      let timeRangesToUse = [];
      if (applicableException && applicableException.startTime && applicableException.endTime) {
        // Use exception time range instead of week hours
        timeRangesToUse = [{
          startTime: applicableException.startTime,
          endTime: applicableException.endTime
        }];
        const exceptionType = applicableException.type === 'special_availability' ? 'special_availability' : 'custom_hours';
        const serviceInfo = applicableException.type === 'special_availability' && applicableException.appointmentTypeId 
          ? ` for service ${appointmentTypeId}` 
          : ' (all services)';
        console.log(`✅ Using ${exceptionType} for ${dateStrInUserTz}${serviceInfo}: ${applicableException.startTime} - ${applicableException.endTime}`);
        console.log(`Time ranges to use:`, timeRangesToUse);
      } else {
        // Use regular week hours
        timeRangesToUse = dayAvailability;
        console.log(`Using regular week hours for ${dateStrInUserTz}, dayAvailability count: ${dayAvailability.length}`);
        if (applicableException) {
          console.log(`⚠️ Warning: Exception found but missing startTime/endTime:`, {
            type: applicableException.type,
            hasStartTime: !!applicableException.startTime,
            hasEndTime: !!applicableException.endTime
          });
        }
      }

      // Sort availability by start time
      timeRangesToUse.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      for (const availSlot of timeRangesToUse) {
        console.log(`Processing availability slot: ${availSlot.startTime} - ${availSlot.endTime}`);
        const [startHour, startMin] = availSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = availSlot.endTime.split(':').map(Number);
        
        const startTimeMinutes = startHour * 60 + startMin;
        const endTimeMinutes = endHour * 60 + endMin;
        
        console.log(`Time range in minutes: ${startTimeMinutes} to ${endTimeMinutes}`);
        
        let currentTimeMinutes = startTimeMinutes;
        let slotIndex = 0;
        
        while (currentTimeMinutes + appointmentDuration <= endTimeMinutes) {
          const slotHour = Math.floor(currentTimeMinutes / 60);
          const slotMin = currentTimeMinutes % 60;
          
          // Create the appointment time for conflict checking IN THE USER'S TIMEZONE
          const slotTimeStr = `${dateStrInUserTz} ${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}:00`;
          const appointmentDateTime = dayjs.tz(slotTimeStr, userTimezone).toDate();

          console.log(`Checking slot ${slotIndex++}: ${slotHour}:${slotMin.toString().padStart(2, '0')} (${appointmentDateTime.toISOString()})`);
          
          // Check for conflicts with existing bookings (including buffer times)
          const hasConflict = dateBookings.some(booking => {
            const bookingApptType = bookingAppointmentTypes.get(booking.appointmentTypeId);
            const bookingBufferBefore = bookingApptType?.bufferTimeBefore || 0;
            const bookingBufferAfter = bookingApptType?.bufferTime || 0;
            
            const bookingStart = new Date(booking.appointmentDate);
            
            // Existing booking's effective time range includes prep time before and cleanup time after
            const bookingEffectiveStart = new Date(bookingStart.getTime() - bookingBufferBefore * 60 * 1000);
            const bookingEffectiveEnd = new Date(bookingStart.getTime() + (booking.duration || 30) * 60 * 1000 + bookingBufferAfter * 60 * 1000);
            
            // New slot's effective time range includes prep time before and cleanup time after
            const slotEffectiveStart = new Date(appointmentDateTime.getTime() - bufferTimeBefore * 60 * 1000);
            const slotEffectiveEnd = new Date(appointmentDateTime.getTime() + appointmentDuration * 60 * 1000 + bufferTimeAfter * 60 * 1000);
            
            // Check for overlap between the effective time ranges
            const overlap = slotEffectiveStart < bookingEffectiveEnd && slotEffectiveEnd > bookingEffectiveStart;
            if (overlap) {
              console.log(`  ❌ Conflict with existing booking at ${bookingStart.toISOString()}`);
            }
            return overlap;
          });
          
          if (!hasConflict) {
            // Create the slot time in the business owner's timezone
            // Use the already-computed date in user's timezone (not reinterpret customer's date)
            const slotDateTimeInOwnerTz = dayjs.tz(`${dateStrInUserTz} ${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}:00`, userTimezone);

            // Convert to UTC and store as ISO string
            const slotUTC = slotDateTimeInOwnerTz.utc();
            const isoString = slotUTC.toISOString();

            console.log(`  ✅ Slot available: ${slotHour}:${slotMin.toString().padStart(2, '0')} (${isoString})`);
            slots.push(isoString);
          } else {
            console.log(`  ⏭️  Slot skipped due to conflict`);
          }
          
          currentTimeMinutes += totalSlotTime;
        }
      }

      // Filter out past slots for the current day
      // Get current time in customer's timezone
      const nowInCustomerTz = dayjs().tz(customerTz);
      const currentDateInCustomerTz = nowInCustomerTz.format('YYYY-MM-DD');
      const selectedDateInCustomerTz = customerDateInCustomerTz.format('YYYY-MM-DD');

      console.log(`Current time in customer TZ: ${nowInCustomerTz.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`Selected date in customer TZ: ${selectedDateInCustomerTz}`);

      // Only filter past slots if customer is selecting today
      const filteredSlots = currentDateInCustomerTz === selectedDateInCustomerTz
        ? slots.filter(slotIsoString => {
            // Convert UTC slot time to customer's timezone
            const slotInCustomerTz = dayjs.utc(slotIsoString).tz(customerTz);
            const isPast = slotInCustomerTz.isBefore(nowInCustomerTz);

            if (isPast) {
              console.log(`  ⏭️  Filtering past slot: ${slotInCustomerTz.format('YYYY-MM-DD HH:mm:ss')} (before ${nowInCustomerTz.format('YYYY-MM-DD HH:mm:ss')})`);
            }

            return !isPast;
          })
        : slots;

      console.log(`Generated ${slots.length} time slots, ${filteredSlots.length} after filtering past slots:`, filteredSlots);
      res.json({ slots: filteredSlots });
    } catch (error) {
      console.error('Slots endpoint error:', error);
      res.status(500).json({
        message: "Failed to get available slots",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/availability/:userId", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is requesting their own availability
      if (req.params.userId !== session.userId) {
        return res.status(403).json({ message: "Permission denied: Cannot access another user's availability" });
      }

      const availability = await storage.getAvailabilityByUser(req.params.userId);
      console.log(`GET /api/availability/${req.params.userId} - Found ${availability.length} records:`, availability);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/availability/:id", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Fetch existing availability to verify ownership
      const existing = await storage.getAvailability(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Availability not found" });
      }

      // Verify ownership
      if (existing.userId !== session.userId) {
        return res.status(403).json({ message: "Permission denied: Cannot update another user's availability" });
      }

      const updates = req.body;
      console.log(`PUT /api/availability/${req.params.id} - Updates:`, updates);
      const availability = await storage.updateAvailability(req.params.id, updates);
      console.log(`Updated availability result:`, availability);
      res.json({ message: "Availability updated successfully", availability });
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/availability/:id", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Fetch existing availability to verify ownership
      const existing = await storage.getAvailability(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Availability not found" });
      }

      // Verify ownership
      if (existing.userId !== session.userId) {
        return res.status(403).json({ message: "Permission denied: Cannot delete another user's availability" });
      }

      const success = await storage.deleteAvailability(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Availability not found" });
      }
      res.json({ message: "Availability deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Debug endpoint to check availability data
  app.get("/api/debug/availability/:userId", async (req, res) => {
    try {
      const availability = await storage.getAvailabilityByUser(req.params.userId);
      res.json({ 
        userId: req.params.userId,
        count: availability.length,
        records: availability 
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user._id, email: user.email, name: user.name, businessName: user.businessName, logoUrl: user.logoUrl, welcomeMessage: user.welcomeMessage, primaryColor: user.primaryColor, secondaryColor: user.secondaryColor, accentColor: user.accentColor, timezone: user.timezone, weeklyHours: user.weeklyHours, bookingWindow: user.bookingWindow, bookingWindowDate: user.bookingWindowDate, bookingWindowStart: user.bookingWindowStart, bookingWindowEnd: user.bookingWindowEnd, closedMonths: user.closedMonths, slug: user.slug });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get user by slug for public booking pages
  app.get("/api/users/by-slug/:slug", async (req, res) => {
    try {
      const user = await storage.getUserBySlug(req.params.slug);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return public user data only
      const publicUserData = { 
        id: user._id,
        name: user.name,
        businessName: user.businessName, 
        logoUrl: user.logoUrl, 
        picture: user.picture,
        welcomeMessage: user.welcomeMessage, 
        primaryColor: user.primaryColor, 
        secondaryColor: user.secondaryColor, 
        accentColor: user.accentColor, 
        timezone: user.timezone,
        slug: user.slug
      };
      
      console.log('Public user data returned for slug:', req.params.slug);
      console.log('Picture URL:', publicUserData.picture);
      
      res.json(publicUserData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user by slug", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get user features (public endpoint for booking page)
  app.get("/api/user-features/:userId", async (req, res) => {
    try {
      const { getUserFeatures } = await import("./lib/plan-features");
      const features = await getUserFeatures(req.params.userId);
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user features", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      // Check authentication  
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Ensure user can only update their own profile
      if (session.userId !== req.params.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate request body with Zod
      const updateUserSchema = z.object({
        businessName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        logoUrl: z.union([
          z.string().refine((val) => {
            // Validate base64 image format and size
            const matches = val.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
            if (!matches) return false;
            const base64Data = matches[2];
            const sizeInBytes = (base64Data.length * 3) / 4;
            return sizeInBytes <= 5 * 1024 * 1024; // 5MB limit
          }, "Logo must be a valid image (PNG, JPEG, GIF, WebP) under 5MB"),
          z.null(),
          z.literal("")
        ]).optional(),
        welcomeMessage: z.string().max(500).optional(),
        timezone: z.string().optional(),
        language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Must be a valid language code (e.g., 'en', 'en-US')").optional(),
        dateFormat: z.enum([
          "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "dd.MM.yyyy", 
          "dd-MM-yyyy", "MMM dd, yyyy", "dd MMM yyyy"
        ]).optional(),
        timeFormat: z.enum(["12", "24"]).optional(),
        country: z.string().regex(/^[A-Z]{2}$/, "Must be a valid 2-letter country code").optional(),
        slug: z.string().regex(/^[a-z0-9-]+$/, "Must be lowercase letters, numbers, and hyphens only").min(3).max(50).optional(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
        secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional()
      });

      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        console.log("Validation failed:", validation.error.issues);
        console.log("Request body:", req.body);
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validation.error.issues 
        });
      }

      const { slug, ...validatedUpdates } = validation.data;
      const finalUpdates: any = { ...validatedUpdates };
      
      // Auto-generate slug from business name if business name is updated
      if (validatedUpdates.businessName) {
        const baseSlug = toSlug(validatedUpdates.businessName);
        
        // Check for reserved slugs - block exact matches or any slugs that start with reserved terms
        const isReservedSlug = RESERVED_SLUGS.some(reserved => 
          baseSlug === reserved || baseSlug.startsWith(reserved)
        );
        
        if (isReservedSlug) {
          return res.status(400).json({ 
            message: `Business name "${validatedUpdates.businessName}" generates a reserved URL path. Please choose a different business name.` 
          });
        }
        
        const uniqueSlug = await ensureUniqueSlug(baseSlug, req.params.id);
        
        // Double-check that the final unique slug is not reserved
        const isUniqueSlugReserved = RESERVED_SLUGS.some(reserved => 
          uniqueSlug === reserved || uniqueSlug.startsWith(reserved)
        );
        
        if (isUniqueSlugReserved) {
          return res.status(400).json({ 
            message: `Business name generates a reserved URL path. Please choose a different business name.` 
          });
        }
        
        finalUpdates.slug = uniqueSlug;
      }
      
      // NEVER accept manual slug updates - ignore any slug field in body

      const user = await storage.updateUser(req.params.id, finalUpdates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User updated successfully", user: { id: user._id, email: user.email, name: user.name, businessName: user.businessName, logoUrl: user.logoUrl, welcomeMessage: user.welcomeMessage, timezone: user.timezone, primaryColor: user.primaryColor, secondaryColor: user.secondaryColor, accentColor: user.accentColor } });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Send OTP for email change
  app.post("/api/users/change-email/send-otp", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      const { newEmail } = req.body;
      
      if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ message: 'New email address is required' });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ message: 'Invalid email address format' });
      }
      
      // Get current user to check if email is different
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
        return res.status(400).json({ message: 'New email must be different from current email' });
      }
      
      // Check if email is already taken
      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser._id !== userId) {
        return res.status(400).json({ message: 'This email address is already in use' });
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 10-minute expiration
      emailChangeOtps.set(userId, {
        otp,
        newEmail: newEmail.toLowerCase(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });
      
      // Send OTP email
      await sendEmailChangeOtp(newEmail, otp);
      
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ 
        message: 'Failed to send OTP', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Verify OTP and change email
  app.post("/api/users/change-email/verify-otp", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      const { newEmail, otp } = req.body;
      
      if (!newEmail || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
      }
      
      if (typeof otp !== 'string' || otp.length !== 6) {
        return res.status(400).json({ message: 'OTP must be 6 digits' });
      }
      
      // Get stored OTP data
      const storedData = emailChangeOtps.get(userId);
      if (!storedData) {
        return res.status(400).json({ message: 'OTP not found or expired. Please request a new OTP.' });
      }
      
      // Check expiration
      if (storedData.expiresAt < Date.now()) {
        emailChangeOtps.delete(userId);
        return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
      }
      
      // Verify OTP and email match
      if (storedData.otp !== otp || storedData.newEmail.toLowerCase() !== newEmail.toLowerCase()) {
        return res.status(400).json({ message: 'Invalid OTP or email mismatch' });
      }
      
      // Get user to verify they still exist
      const user = await storage.getUser(userId);
      if (!user) {
        emailChangeOtps.delete(userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if email is still available
      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser._id !== userId) {
        emailChangeOtps.delete(userId);
        return res.status(400).json({ message: 'This email address is already in use' });
      }
      
      // Update email in Convex
      await storage.updateUser(userId, { email: newEmail.toLowerCase() });
      
      // Remove OTP after successful change
      emailChangeOtps.delete(userId);
      
      res.json({ message: 'Email changed successfully' });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ 
        message: 'Failed to verify OTP', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Send OTP for password change
  app.post("/api/users/change-password/send-otp", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      // Get current user to get email
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.email) {
        return res.status(400).json({ message: 'User email not found' });
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 10-minute expiration
      passwordChangeOtps.set(userId, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });
      
      // Send OTP email
      await sendPasswordChangeOtp(user.email, otp);
      
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending password change OTP:', error);
      res.status(500).json({ 
        message: 'Failed to send OTP', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Verify OTP for password change
  app.post("/api/users/change-password/verify-otp", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      const { otp } = req.body;
      
      if (!otp) {
        return res.status(400).json({ message: 'OTP is required' });
      }
      
      if (typeof otp !== 'string' || otp.length !== 6) {
        return res.status(400).json({ message: 'OTP must be 6 digits' });
      }
      
      // Get stored OTP data
      const storedData = passwordChangeOtps.get(userId);
      if (!storedData) {
        return res.status(400).json({ message: 'OTP not found or expired. Please request a new OTP.' });
      }
      
      // Check expiration
      if (storedData.expiresAt < Date.now()) {
        passwordChangeOtps.delete(userId);
        return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
      }
      
      // Verify OTP
      if (storedData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      // OTP verified - keep it stored for the password update step
      res.json({ message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Error verifying password change OTP:', error);
      res.status(500).json({ 
        message: 'Failed to verify OTP', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Update password after OTP verification
  app.post("/api/users/change-password/update", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
      }
      
      if (typeof newPassword !== 'string' || newPassword.length < 12) {
        return res.status(400).json({ message: 'Password must be at least 12 characters long' });
      }
      
      // Verify OTP was previously verified
      const storedData = passwordChangeOtps.get(userId);
      if (!storedData) {
        return res.status(400).json({ message: 'Please verify your OTP first' });
      }
      
      // Get user to verify they still exist
      const user = await storage.getUser(userId);
      if (!user) {
        passwordChangeOtps.delete(userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update password in Convex
      await storage.updateUser(userId, { password: hashedPassword });
      
      // Remove OTP after successful password change
      passwordChangeOtps.delete(userId);
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ 
        message: 'Failed to update password', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Delete user account
  app.delete("/api/users/:id", async (req, res) => {
    try {
      // Check authentication
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is deleting their own account
      if (session.userId !== req.params.id) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own account" });
      }

      const userId = req.params.id;

      // Get user info before deletion to check for Google connections
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Revoke Google Calendar access before deleting user data
      // This ensures Google forgets the calendar connection
      try {
        await googleCalendarService.disconnect(userId);
        console.log(`✅ Google Calendar access revoked for user: ${userId}`);
      } catch (error) {
        console.error('Error revoking Google Calendar access:', error);
        // Continue with account deletion even if calendar revocation fails
      }

      // For Google login OAuth, we don't store access tokens, so we can't directly revoke
      // However, deleting the user account will effectively break the connection
      // Users can manually revoke app access in their Google Account settings if needed
      if (user.googleId) {
        console.log(`ℹ️ User has Google login (googleId: ${user.googleId}). Note: Google login tokens are not stored, so manual revocation may be needed in Google Account settings.`);
      }

      // Before deleting from Convex, delete Digital Ocean images if they exist
      try {
        const branding = await storage.getBranding(userId);
        
        if (branding) {
          // Delete logo from Digital Ocean if it exists
          if (branding.logoUrl && isSpacesUrl(branding.logoUrl)) {
            try {
              await deleteFile(branding.logoUrl);
              console.log(`✅ Deleted logo from Digital Ocean: ${branding.logoUrl}`);
            } catch (error) {
              console.error('Error deleting logo from Digital Ocean:', error);
              // Continue with account deletion even if image deletion fails
            }
          }

          // Delete profile picture from Digital Ocean if it exists
          if (branding.profilePictureUrl && isSpacesUrl(branding.profilePictureUrl)) {
            try {
              await deleteFile(branding.profilePictureUrl);
              console.log(`✅ Deleted profile picture from Digital Ocean: ${branding.profilePictureUrl}`);
            } catch (error) {
              console.error('Error deleting profile picture from Digital Ocean:', error);
              // Continue with account deletion even if image deletion fails
            }
          }
        }
      } catch (error) {
        console.error('Error fetching/deleting branding images:', error);
        // Continue with account deletion even if image deletion fails
      }

      // Delete the user and all associated data from Convex
      await storage.deleteUser(userId);

      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        message: "Failed to delete account",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin routes

  // Blocked dates routes
  app.get("/api/blocked-dates", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const blockedDates = await storage.getBlockedDatesByUser(userId);
      res.json(blockedDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocked dates", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/blocked-dates", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const blockedDateData = insertBlockedDateSchema.parse({
        ...req.body,
        userId
      });
      const blockedDate = await storage.createBlockedDate(blockedDateData);
      res.json({ message: "Blocked date created successfully", blockedDate });
    } catch (error) {
      res.status(400).json({ message: "Invalid blocked date data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Closed months endpoint
  app.post("/api/closed-months", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { closedMonths } = req.body;

      // Validate that closedMonths is an array of numbers 0-11
      if (!Array.isArray(closedMonths) || !closedMonths.every(m => typeof m === 'number' && m >= 0 && m <= 11)) {
        return res.status(400).json({ message: "closedMonths must be an array of numbers between 0 and 11" });
      }

      await storage.updateUser(userId, { closedMonths });
      res.json({ message: "Closed months updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update closed months", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/blocked-dates/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const blockedDates = await storage.getBlockedDatesByUser(userId);
      const blockedDate = blockedDates.find(b => b._id === req.params.id);
      
      if (!blockedDate) {
        return res.status(404).json({ message: "Blocked date not found" });
      }

      const updates = insertBlockedDateSchema.partial().parse(req.body);
      // Strip userId to prevent ownership changes
      delete (updates as any).userId;
      
      const updatedBlockedDate = await storage.updateBlockedDate(req.params.id, updates);
      
      if (!updatedBlockedDate) {
        return res.status(404).json({ message: "Blocked date not found" });
      }
      
      res.json({ message: "Blocked date updated successfully", blockedDate: updatedBlockedDate });
    } catch (error) {
      res.status(400).json({ message: "Invalid blocked date data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/blocked-dates/:id", async (req, res) => {
    try {
      const success = await storage.deleteBlockedDate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Blocked date not found" });
      }
      res.json({ message: "Blocked date deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blocked date", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // count appointment types for this user
  async function countAppointmentTypes(req: any) {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return 0;
      
      const existingTypes = await storage.getAppointmentTypesByUser(userId);
      return existingTypes.length;
    } catch (error) {
      // If error occurs, return 0 to allow the main handler to do proper validation
      return 0;
    }
  }

  // Appointment types routes
  app.get("/api/appointment-types", async (req, res) => {
    try {
      // Honor query userId for public booking, else use session or demo
      const userId = req.query.userId as string || (req.session as any)?.userId || "demo-user-id";
      const appointmentTypes = await storage.getAppointmentTypesByUser(userId);
      
      // Check if user is on free plan and has more than 1 service
      // If they downgraded from Pro and have more than 1 active service, set all services to inactive
      const features = await getUserFeatures(userId);
      if (features.appointmentTypeLimit === 1 && appointmentTypes.length > 1) {
        const activeServices = appointmentTypes.filter(at => at.isActive);
        // If there are multiple active services, set all to inactive (they downgraded from Pro)
        // This ensures that when they downgrade with multiple active services, all become inactive
        // and they can choose one to activate. If they have only 1 active, that's allowed on free plan.
        if (activeServices.length > 1) {
          await storage.setAllAppointmentTypesInactiveForUser(userId);
          // Fetch updated appointment types
          const updatedAppointmentTypes = await storage.getAppointmentTypesByUser(userId);
          return res.json(updatedAppointmentTypes);
        }
      }
      
      res.json(appointmentTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment types", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/appointment-types/:id", async (req, res) => {
    try {
      const appointmentType = await storage.getAppointmentType(req.params.id);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      res.json(appointmentType);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment type", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/appointment-types", async (req, res) => {
    try {
      // Require authentication for creation
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check user's plan and enforce appointment type limit
      const features = await getUserFeatures(userId);
      if (features.appointmentTypeLimit !== null) {
        // Get current appointment types count for this user
        const existingAppointmentTypes = await storage.getAppointmentTypesByUser(userId);
        const currentCount = existingAppointmentTypes.length;
        
        if (currentCount >= features.appointmentTypeLimit) {
          return res.status(403).json({ 
            message: `Upgrade to Pro plan to add more services.` 
          });
        }
      }

      const validation = insertAppointmentTypeSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!validation.success) {
        console.error('Validation error:', validation.error.issues);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({ 
          message: "Invalid appointment type data", 
          errors: validation.error.issues 
        });
      }
      
      console.log('Creating appointment type with data:', JSON.stringify(validation.data, null, 2));
      const appointmentType = await storage.createAppointmentType(validation.data);
      res.json({ message: "Appointment type created successfully", appointmentType });
    } catch (error) {
      // If we already sent a response (403), don't send another one
      if (res.headersSent) {
        return;
      }
      console.error('Error creating appointment type:', error);
      res.status(400).json({ message: "Invalid appointment type data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/appointment-types/:id", async (req, res) => {
    try {
      // Require authentication and ownership verification
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of the appointment type
      const existingType = await storage.getAppointmentType(req.params.id);
      if (!existingType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      if (existingType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const validation = insertAppointmentTypeSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid appointment type data", 
          errors: validation.error.issues 
        });
      }

      let updates = validation.data;
      
      // Handle intakeFormId: if null, we want to clear it
      // Check the raw request body to see if intakeFormId was explicitly set to null
      if ('intakeFormId' in req.body) {
        if (req.body.intakeFormId === null) {
          // Explicitly include null in updates - Convex should handle optional fields
          updates.intakeFormId = null;
        } else if (req.body.intakeFormId === undefined) {
          // If undefined, don't include it in the update
          delete updates.intakeFormId;
        }
      }
      
      // Handle requirePayment: explicitly include boolean values (including false)
      if ('requirePayment' in req.body) {
        updates.requirePayment = req.body.requirePayment === true;
      }
      
      console.log('Updating appointment type with:', updates);
      const appointmentType = await storage.updateAppointmentType(req.params.id, updates);
      res.json({ message: "Appointment type updated successfully", appointmentType });
    } catch (error) {
      console.error('Error updating appointment type:', error);
      res.status(500).json({ message: "Failed to update appointment type", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/appointment-types/:id", async (req, res) => {
    try {
      // Require authentication and ownership verification
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of the appointment type
      const existingType = await storage.getAppointmentType(req.params.id);
      if (!existingType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      if (existingType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const success = await storage.deleteAppointmentType(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      res.json({ message: "Appointment type deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment type", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Intake Forms routes
  app.get("/api/intake-forms", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('Fetching intake forms for userId:', userId);
      let forms = await storage.getIntakeFormsByUser(userId);
      console.log('Forms fetched from storage:', forms?.length || 0, Array.isArray(forms));
      
      // Ensure we always return ALL forms (including inactive ones)
      // The query should return all forms, but let's make sure
      if (!Array.isArray(forms)) {
        console.warn('Forms is not an array, setting to empty array. Type:', typeof forms, 'Value:', forms);
        forms = [];
      }
      
      // Check if user is on free plan and has more than 1 form
      // If they downgraded from Pro, set all forms to inactive so they can choose one to activate
      let isFreePlan = false;
      try {
        console.log('Getting user features for userId:', userId);
        const features = await getUserFeatures(userId);
        console.log('User features:', features?.formLimit);
        isFreePlan = features?.formLimit === 1;
      } catch (featuresError) {
        // If there's an error getting features, try to get subscription directly as fallback
        console.error('Error getting user features for forms:', featuresError);
        console.error('Error stack:', featuresError instanceof Error ? featuresError.stack : 'No stack trace');
        try {
          const subscription = await storage.getUserSubscription(userId);
          console.log('Got subscription directly, planId:', subscription?.planId);
          isFreePlan = !subscription || subscription.planId === 'free' || !subscription.planId;
        } catch (subError) {
          console.error('Error getting subscription directly:', subError);
          // If we can't determine the plan, assume free plan to be safe
          isFreePlan = true;
        }
      }
      
      // If on free plan and has more than 1 form, check for multiple active forms
      if (isFreePlan && forms.length > 1) {
        const activeForms = forms.filter(f => f.isActive);
        console.log('Total forms:', forms.length, 'Active forms:', activeForms.length);
        console.log('Forms status:', forms.map(f => ({ id: f._id, name: f.name, isActive: f.isActive })));
        
        // If there are multiple active forms, set all to inactive (they downgraded from Pro)
        // This ensures that when they downgrade with multiple active forms, all become inactive
        // and they can choose one to activate. If they have only 1 active, that's allowed on free plan.
        // But if they have more than 1 form total and more than 1 active, set all to inactive.
        if (activeForms.length > 1) {
          console.log('Setting all forms to inactive because there are', activeForms.length, 'active forms on free plan');
          try {
            const result = await storage.setAllIntakeFormsInactiveForUser(userId);
            console.log('setAllIntakeFormsInactiveForUser returned:', result);
            
            // Fetch updated forms - ensure we get ALL forms (including inactive ones)
            forms = await storage.getIntakeFormsByUser(userId);
            if (!Array.isArray(forms)) {
              forms = [];
            }
            console.log('Forms after setting all inactive:', forms.length, forms.map(f => ({ id: f._id, name: f.name, isActive: f.isActive })));
            
            // Verify all forms are now inactive
            const stillActive = forms.filter(f => f.isActive);
            if (stillActive.length > 0) {
              console.error('WARNING: Some forms are still active after deactivation:', stillActive.map(f => ({ id: f._id, name: f.name })));
              // Force deactivate any remaining active forms
              for (const form of stillActive) {
                console.log('Force deactivating form:', form._id);
                await storage.updateIntakeForm(form._id, { isActive: false });
              }
              // Fetch again
              forms = await storage.getIntakeFormsByUser(userId);
              if (!Array.isArray(forms)) {
                forms = [];
              }
            }
          } catch (deactivateError) {
            console.error('Error deactivating forms:', deactivateError);
            // Try individual deactivation as fallback
            for (const form of activeForms) {
              try {
                console.log('Deactivating form individually:', form._id);
                await storage.updateIntakeForm(form._id, { isActive: false });
              } catch (individualError) {
                console.error('Error deactivating individual form:', form._id, individualError);
              }
            }
            // Fetch again
            forms = await storage.getIntakeFormsByUser(userId);
            if (!Array.isArray(forms)) {
              forms = [];
            }
          }
        }
      }
      
      // Ensure ALL forms are returned (both active and inactive)
      // The query should already return all forms, but this is a safeguard
      
      // Always return ALL forms, regardless of active status
      console.log('Returning forms:', forms.length, forms.map(f => ({ id: f._id, name: f.name, isActive: f.isActive })));
      res.json(forms);
    } catch (error) {
      console.error('Error in /api/intake-forms:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to fetch intake forms", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/intake-forms/:id", async (req, res) => {
    try {
      // Allow public access via userId query param (for public booking pages)
      const userId = req.query.userId as string || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const form = await storage.getIntakeFormById(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Verify ownership (only if authenticated via session, not public query param)
      if (!req.query.userId && form.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // For public access, verify the form belongs to the requested user
      if (req.query.userId && form.userId !== req.query.userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intake form", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/intake-forms", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const formData = {
        userId,
        name: req.body.name,
        description: req.body.description,
        fields: req.body.fields,
        isActive: req.body.isActive ?? true,
        sortOrder: req.body.sortOrder ?? 0,
      };

      const form = await storage.createIntakeForm(formData);
      res.json({ message: "Intake form created successfully", form });
    } catch (error) {
      res.status(500).json({ message: "Failed to create intake form", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/intake-forms/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership
      const existingForm = await storage.getIntakeFormById(req.params.id);
      if (!existingForm) {
        return res.status(404).json({ message: "Intake form not found" });
      }
      if (existingForm.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Only include fields that are actually provided in the request
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.fields !== undefined) updates.fields = req.body.fields;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;

      const form = await storage.updateIntakeForm(req.params.id, updates);
      res.json({ message: "Intake form updated successfully", form });
    } catch (error) {
      res.status(500).json({ message: "Failed to update intake form", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/intake-forms/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership
      const existingForm = await storage.getIntakeFormById(req.params.id);
      if (!existingForm) {
        return res.status(404).json({ message: "Intake form not found" });
      }
      if (existingForm.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const success = await storage.deleteIntakeForm(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Intake form not found" });
      }
      res.json({ message: "Intake form deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete intake form", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // PUBLIC Intake Form Submission endpoints (no authentication required)

  // Upload file to temp storage
  app.post("/api/public/intake-forms/upload", upload.single("file"), async (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/heic', 'application/pdf'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Invalid file type. Only PNG, JPG, HEIC, and PDF are allowed"
        });
      }

      // Generate unique filename
      const fileExtension = req.file.originalname.split('.').pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      // Upload to Digital Ocean Spaces with temp subfolder
      const fileUrl = await uploadFile({
        fileBuffer: req.file.buffer,
        fileName: uniqueFilename,
        folder: 'intake_form_uploads',
        subfolder: `temp/${sessionId}`,
        contentType: req.file.mimetype,
      });

      res.json({
        message: "File uploaded successfully",
        fileUrl,
        originalName: req.file.originalname
      });
    } catch (error) {
      console.error("Error uploading intake form file:", error);
      res.status(500).json({
        message: "Failed to upload file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete file from temp storage
  app.delete("/api/public/intake-forms/delete-file", async (req, res) => {
    try {
      const { fileUrl } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ message: "File URL required" });
      }

      // Verify it's a temp file
      if (!fileUrl.includes('/intake_form_uploads/temp/')) {
        return res.status(403).json({ message: "Can only delete temp files" });
      }

      const success = await deleteFile(fileUrl);

      if (success) {
        res.json({ message: "File deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete file" });
      }
    } catch (error) {
      console.error("Error deleting intake form file:", error);
      res.status(500).json({
        message: "Failed to delete file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save temporary form submission
  app.post("/api/public/intake-forms/save-temp", async (req, res) => {
    try {
      const { sessionId, intakeFormId, appointmentTypeId, responses, fileUrls } = req.body;

      if (!sessionId || !intakeFormId || !appointmentTypeId || !responses) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if temp submission already exists
      const existing = await storage.getTempFormSubmissionBySession(sessionId);

      if (existing) {
        // Update existing submission
        await storage.updateTempFormSubmission(sessionId, {
          responses,
          fileUrls: fileUrls || [],
        });
        res.json({ message: "Temp submission updated successfully" });
      } else {
        // Create new temp submission
        await storage.createTempFormSubmission({
          sessionId,
          intakeFormId,
          appointmentTypeId,
          responses,
          fileUrls: fileUrls || [],
        });
        res.json({ message: "Temp submission created successfully" });
      }
    } catch (error) {
      console.error("Error saving temp form submission:", error);
      res.status(500).json({
        message: "Failed to save temp submission",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Finalize form submission (move files and create permanent record)
  app.post("/api/public/intake-forms/finalize", async (req, res) => {
    try {
      const { sessionId, bookingId } = req.body;

      if (!sessionId || !bookingId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get temp submission
      const tempSubmission = await storage.getTempFormSubmissionBySession(sessionId);
      if (!tempSubmission) {
        return res.status(404).json({ message: "Temp submission not found" });
      }

      // Move files from temp to booking folder
      const newFileUrls = await moveIntakeFormFiles(tempSubmission.fileUrls, bookingId);

      // Update responses with new file URLs
      const updatedResponses = tempSubmission.responses.map((response: any) => {
        if (response.fileUrls && Array.isArray(response.fileUrls)) {
          // Match old URLs to new URLs
          const updatedFileUrls = response.fileUrls.map((oldUrl: string) => {
            const index = tempSubmission.fileUrls.indexOf(oldUrl);
            return index !== -1 ? newFileUrls[index] : oldUrl;
          });
          return { ...response, fileUrls: updatedFileUrls };
        }
        return response;
      });

      // Update temp submission with new file URLs before finalizing
      await storage.updateTempFormSubmission(sessionId, {
        responses: updatedResponses,
        fileUrls: newFileUrls,
      });

      // Create permanent submission and delete temp
      await storage.finalizeFormSubmission(sessionId, bookingId);

      res.json({
        message: "Form submission finalized successfully",
        fileUrls: newFileUrls
      });
    } catch (error) {
      console.error("Error finalizing form submission:", error);
      res.status(500).json({
        message: "Failed to finalize submission",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test route
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong" });
  });

  const requireAdmin = async (req: any, res: any, next: any) => {
    // If HTTP Basic Auth already passed, allow immediately
    const { isBasicAuthed } = await import("./security/adminAuth");
    if (isBasicAuthed(req)) return next();

    // Otherwise require your role-based admin session (existing behavior)
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.user = user;
    next();
  };

  // Zod body validation middleware
  const zodBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.issues 
        });
      }
      return res.status(400).json({ message: "Invalid request body" });
    }
  };

  // Availability settings route
  app.post('/api/settings/availability', requireAuth, zodBody(availabilitySettingsSchema), async (req, res) => {
    try {
      const session = req.session as any;
      const { weeklyHours, timezone, bookingWindow, bookingWindowDate, bookingWindowStart, bookingWindowEnd, closedMonths } = req.body;
      
      const updateData: any = { 
        weeklyHours, 
        timezone 
      };
      
      if (bookingWindow !== undefined) {
        updateData.bookingWindow = bookingWindow;
      }
      
      if (bookingWindowDate !== undefined) {
        updateData.bookingWindowDate = bookingWindowDate;
      }
      
      if (bookingWindowStart !== undefined) {
        updateData.bookingWindowStart = bookingWindowStart;
      }
      
      if (bookingWindowEnd !== undefined) {
        updateData.bookingWindowEnd = bookingWindowEnd;
      }
      
      if (closedMonths !== undefined) {
        updateData.closedMonths = closedMonths;
      }
      
      await storage.updateUser(session.userId, updateData);
      
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to save availability settings", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Public plans endpoint for pricing display  
  app.get("/api/plans", async (req, res) => {
    try {
      // Public endpoint for viewing available plans  
      const plans = await storage.getAllSubscriptionPlans();
      
      // Public endpoint returns only active plans with pricing info
      const activePlans = plans.filter(plan => plan.isActive);
      
      // Transform to match frontend expectations
      const publicPlans = activePlans.map(plan => ({
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.priceMonthly || 0, // Keep price in cents for frontend
        priceYearly: plan.priceYearly || 0,
        features: plan.features || {},
        isActive: plan.isActive
      }));
      
      res.json(publicPlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Subscription Plans API Routes - GET public for billing display, admin ops require admin
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      // Public endpoint for viewing available plans
      const plans = await storage.getAllSubscriptionPlans();
      
      // Public endpoint returns only active plans
      const activePlans = plans.filter(plan => plan.isActive);
      
      res.json(activePlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin Plans API Routes (new feature-based system)
  app.get("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const { id, name, description, banner, originalPrice,
              priceMonthly, priceYearly, features, isActive } = req.body;

      const normalized: FeaturesShape = applyDefaults(features ?? {});
      const rec = {
        id, name, description: description ?? null,
        banner: banner ?? null,
        originalPrice: originalPrice ?? null,
        priceMonthly: priceMonthly ?? null,
        priceYearly: priceYearly ?? null,
        features: normalized,
        isActive: isActive ?? true,
      };

      // Create plan first
      const upserted = await storage.createSubscriptionPlan(rec);
      
      if (!upserted) {
        return res.status(500).json({ message: "Failed to create subscription plan" });
      }

      // Ensure Stripe prices
      const created = await ensureStripePrices({
        id: upserted._id,
        name: upserted.name,
        priceMonthly: upserted.priceMonthly,
        priceYearly: upserted.priceYearly,
        stripePriceMonthly: upserted.stripePriceMonthly,
        stripePriceYearly: upserted.stripePriceYearly,
      });

      if (created.monthly || created.yearly) {
        await storage.updateSubscriptionPlan(upserted._id, {
          stripePriceMonthly: created.monthly ?? upserted.stripePriceMonthly,
          stripePriceYearly: created.yearly ?? upserted.stripePriceYearly,
        });
      }

      const plan = await storage.getSubscriptionPlan(upserted._id);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ message: "Invalid plan data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, banner, originalPrice,
              priceMonthly, priceYearly, features, isActive } = req.body;

      const normalized: FeaturesShape = applyDefaults(features ?? {});
      const updates = {
        name, 
        description: description ?? null,
        banner: banner ?? null,
        originalPrice: originalPrice ?? null,
        priceMonthly: priceMonthly ?? null,
        priceYearly: priceYearly ?? null,
        features: normalized,
        isActive: isActive ?? true,
      };

      // Update plan first
      const updated = await storage.updateSubscriptionPlan(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Ensure Stripe prices if prices changed
      if (priceMonthly !== undefined || priceYearly !== undefined) {
        const created = await ensureStripePrices({
          id: updated._id,
          name: updated.name,
          priceMonthly: updated.priceMonthly,
          priceYearly: updated.priceYearly,
          stripePriceMonthly: updated.stripePriceMonthly,
          stripePriceYearly: updated.stripePriceYearly,
        });

        if (created.monthly || created.yearly) {
          await storage.updateSubscriptionPlan(updated._id, {
            stripePriceMonthly: created.monthly ?? updated.stripePriceMonthly,
            stripePriceYearly: created.yearly ?? updated.stripePriceYearly,
          });
        }
      }

      const plan = await storage.getSubscriptionPlan(id);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ message: "Invalid plan data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteSubscriptionPlan(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json({ message: "Plan deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plan", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Keep old admin routes for backward compatibility
  app.get("/api/admin/subscription-plans", requireAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/admin/subscription-plans", requireAdmin, async (req, res) => {
    // Redirect to new API
    return res.status(301).json({ message: "Use /api/admin/plans instead" });
  });

  app.patch("/api/admin/subscription-plans/:id", requireAdmin, async (req, res) => {
    // Redirect to new API
    return res.status(301).json({ message: "Use /api/admin/plans instead" });
  });

  app.delete("/api/admin/subscription-plans/:id", requireAdmin, async (req, res) => {
    // Redirect to new API
    return res.status(301).json({ message: "Use /api/admin/plans instead" });
  });

  // Branding API Routes
  app.get("/api/branding", async (req, res) => {
    try {
      // Allow public access when userId is provided in query (for public booking pages)
      // Honor query userId for public booking, else require authentication
      const queryUserId = req.query.userId as string;
      let userId: string;
      
      if (queryUserId) {
        // Public access via userId query parameter
        userId = queryUserId;
      } else {
        // Require authentication for user's own branding
        const session = req.session as any;
        if (!session?.userId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        userId = session.userId;
      }
      
      // Default colors
      const DEFAULT_PRIMARY = '#0053F1';
      const DEFAULT_SECONDARY = '#64748B';
      const DEFAULT_ACCENT = '#121212';
      
      let branding = await storage.getBranding(userId);
      if (!branding) {
        // Create default branding if none exists (only for authenticated requests)
        if (!queryUserId) {
          branding = await storage.createBranding({
            userId,
            primary: DEFAULT_PRIMARY,
            secondary: DEFAULT_SECONDARY,
            accent: DEFAULT_ACCENT, // Text color maps to accent
            logoUrl: undefined,
            profilePictureUrl: undefined,
            displayName: undefined,
            showDisplayName: true,
            showProfilePicture: true,
            usePlatformBranding: true,
          });
        } else {
          // For public requests, return default branding values without saving
          return res.json({
            userId,
            primary: DEFAULT_PRIMARY,
            secondary: DEFAULT_SECONDARY,
            accent: DEFAULT_ACCENT, // Text color maps to accent
            logoUrl: undefined,
            profilePictureUrl: undefined,
            displayName: undefined,
            showDisplayName: true,
            showProfilePicture: true,
            usePlatformBranding: true,
            updatedAt: Date.now()
          });
        }
      }

      // Check if user is on free plan and enforce free plan restrictions
      // This handles downgrades - free users shouldn't have custom colors or logos
      if (branding) {
        const features = await getUserFeatures(userId);
        if (!features.customBranding) {
          // User is on free plan
          let needsUpdate = false;
          const updates: any = {};
          
          // Reset colors to defaults if they're different
          const needsColorReset = 
            (branding.primary && branding.primary !== DEFAULT_PRIMARY) ||
            (branding.secondary && branding.secondary !== DEFAULT_SECONDARY) ||
            (branding.accent && branding.accent !== DEFAULT_ACCENT);
          
          if (needsColorReset) {
            updates.primary = DEFAULT_PRIMARY;
            updates.secondary = DEFAULT_SECONDARY;
            updates.accent = DEFAULT_ACCENT;
            needsUpdate = true;
            console.log('BACKEND - Reset branding colors to defaults for free user:', userId);
          }
          
          // Remove logo if it exists (free users can't have logos)
          if (branding.logoUrl) {
            console.log('BACKEND - Free user has logo, deleting it:', branding.logoUrl);
            
            // Delete logo from Digital Ocean Spaces if it's a Spaces URL
            if (isSpacesUrl(branding.logoUrl)) {
              try {
                await deleteFile(branding.logoUrl);
                console.log('BACKEND - Deleted logo file from Digital Ocean Spaces');
              } catch (error) {
                console.error('BACKEND - Error deleting logo file from Spaces:', error);
                // Continue with database cleanup even if file deletion fails
              }
            }
            
            // Clear logo from database
            await storage.clearBrandingField(userId, 'logoUrl');
            console.log('BACKEND - Cleared logo from database for free user');
            
            // Re-fetch branding to get updated state
            branding = await storage.getBranding(userId);
          }
          
          // Ensure Daywise branding toggle is ON (usePlatformBranding = true)
          // Check again after potential logo deletion and re-fetch
          if (branding && branding.usePlatformBranding !== true) {
            updates.usePlatformBranding = true;
            needsUpdate = true;
            console.log('BACKEND - Enabled Daywise branding toggle for free user:', userId);
          }
          
          // Apply any remaining updates (colors and usePlatformBranding)
          if (needsUpdate && branding) {
            branding = await storage.updateBranding(userId, updates);
          }
        }
      }

      console.log('BACKEND - GET /api/branding returning:', {
        logoUrl: branding?.logoUrl,
        logoCropData: branding?.logoCropData,
        profilePictureUrl: branding?.profilePictureUrl,
        profileCropData: branding?.profileCropData
      });
      res.json(branding);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branding", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Proxy image endpoint - fetches image and returns with CORS headers to avoid CORS issues
  app.get("/api/branding/proxy-image", async (req, res) => {
    try {
      const { imageUrl } = req.query;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ message: 'imageUrl is required' });
      }
      
      // Fetch the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Set CORS headers
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL || '').split(',').filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:5174'];
      
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
      } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (allowedOrigins.length > 0) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', contentType);
      
      res.send(imageBuffer);
    } catch (error: any) {
      console.error('Error proxying image:', error);
      res.status(500).json({ message: 'Failed to proxy image', error: error.message });
    }
  });

  // Get cropped image - applies crop server-side to avoid CORS issues
  app.get("/api/branding/cropped-image", async (req, res) => {
    try {
      console.log('BACKEND - Cropped image request received');
      const { imageUrl, cropData } = req.query;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ message: 'imageUrl is required' });
      }
      
      if (!cropData) {
        // No crop data, return original image URL
        return res.redirect(imageUrl);
      }
      
      let parsedCropData;
      try {
        parsedCropData = typeof cropData === 'string' ? JSON.parse(cropData) : cropData;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid cropData format' });
      }
      
      if (!parsedCropData.croppedAreaPixels) {
        return res.redirect(imageUrl);
      }
      
      const pixels = parsedCropData.croppedAreaPixels;
      const rotation = parsedCropData.rotation || 0;
      
      console.log('BACKEND - Processing crop:', { pixels, rotation });
      
      // Fetch the image with error handling
      let imageResponse;
      try {
        imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DaywiseBot/1.0)',
          },
        });
        if (!imageResponse.ok) {
          console.error('BACKEND - Failed to fetch image:', imageResponse.status, imageResponse.statusText);
          return res.status(404).json({ message: 'Image not found' });
        }
      } catch (fetchError: any) {
        console.error('BACKEND - Error fetching image:', fetchError);
        return res.status(500).json({ message: 'Failed to fetch image', error: fetchError.message });
      }
      
      let imageBuffer;
      try {
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        console.log('BACKEND - Image fetched, size:', imageBuffer.length);
      } catch (bufferError: any) {
        console.error('BACKEND - Error converting image to buffer:', bufferError);
        return res.status(500).json({ message: 'Failed to process image', error: bufferError.message });
      }
      
      // Apply crop using sharp with error handling
      let croppedBuffer;
      try {
        // Note: croppedAreaPixels coordinates are in the original image's coordinate system
        // So we extract first, then rotate the cropped result if needed
        let sharpImage = sharp(imageBuffer);
        
        // Get image metadata to validate crop bounds
        const metadata = await sharpImage.metadata();
        const imageWidth = metadata.width || 0;
        const imageHeight = metadata.height || 0;
        
        // Validate and clamp crop coordinates
        const cropLeft = Math.max(0, Math.min(Math.round(pixels.x), imageWidth - 1));
        const cropTop = Math.max(0, Math.min(Math.round(pixels.y), imageHeight - 1));
        const cropWidth = Math.max(1, Math.min(Math.round(pixels.width), imageWidth - cropLeft));
        const cropHeight = Math.max(1, Math.min(Math.round(pixels.height), imageHeight - cropTop));
        
        console.log('BACKEND - Crop bounds:', {
          original: { x: pixels.x, y: pixels.y, width: pixels.width, height: pixels.height },
          clamped: { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight },
          imageSize: { width: imageWidth, height: imageHeight }
        });
        
        // Extract the crop area from the original image
        let croppedImage = sharpImage.extract({
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight,
        });
        
        // Apply rotation to the cropped result if needed
        if (rotation !== 0 && rotation !== 360) {
          croppedImage = croppedImage.rotate(rotation);
        }
        
        // Convert to PNG buffer (preserve original format if possible, but PNG is safe)
        croppedBuffer = await croppedImage.png().toBuffer();
        console.log('BACKEND - Cropped image created, size:', croppedBuffer.length);
      } catch (sharpError: any) {
        console.error('BACKEND - Error processing image with sharp:', sharpError);
        return res.status(500).json({ message: 'Failed to process image crop', error: sharpError.message });
      }
      
      // Set CORS headers BEFORE sending response
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL || '').split(',').filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:5174'];
      
      console.log('BACKEND - Request origin:', origin);
      console.log('BACKEND - Allowed origins:', allowedOrigins);
      
      // Always set CORS headers for localhost in development
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
      } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (allowedOrigins.length > 0) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      console.log('BACKEND - CORS headers set:', {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Content-Type': res.getHeader('Content-Type')
      });
      console.log('BACKEND - Sending cropped image, size:', croppedBuffer.length);
      res.send(croppedBuffer);
    } catch (error: any) {
      console.error('Error creating cropped image:', error);
      res.status(500).json({ message: 'Failed to create cropped image', error: error.message });
    }
  });
  
  // Handle OPTIONS preflight for cropped-image endpoint
  app.options("/api/branding/cropped-image", (req, res) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.FRONTEND_URL || '').split(',').filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:5174'];
    
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
  });

  app.post("/api/branding", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const { primary, secondary, accent, usePlatformBranding, displayName, showDisplayName, showProfilePicture, logoCropData, profileCropData } = req.body || {};
      
      // Plan gate using feature system (disallow custom colors on Free)
      // TODO: Re-enable plan gate later
      // const { getUserFeatures } = await import("./lib/plan-features");
      // const features = await getUserFeatures(userId);
      // if (!features.customBranding) {
      //   return res.status(403).json({ message: "Branding customization requires Pro Plan." });
      // }
      
      // Validate hex colors
      const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
      for (const color of [primary, secondary, accent]) {
        if (color && !HEX_REGEX.test(color)) {
          return res.status(400).json({ message: "Colors must be hex format like #FF6B4A" });
        }
      }

      // Determine platform branding based on features
      // TODO: Re-enable plan-based restriction later
      // const nextUsePlatformBranding = features.customBranding ? !!usePlatformBranding : true;
      const nextUsePlatformBranding = !!usePlatformBranding;

      let branding = await storage.getBranding(userId);
      if (!branding) {
        branding = await storage.createBranding({
          userId, primary, secondary, accent,
          usePlatformBranding: nextUsePlatformBranding,
          displayName,
          showDisplayName: showDisplayName ?? true,
          showProfilePicture: showProfilePicture ?? true
        });
      } else {
        branding = await storage.updateBranding(userId, {
          primary, secondary, accent, 
          usePlatformBranding: nextUsePlatformBranding,
          displayName,
          showDisplayName, 
          showProfilePicture,
          logoCropData: logoCropData !== undefined ? logoCropData : undefined,
          profileCropData: profileCropData !== undefined ? profileCropData : undefined
        });
      }

      res.json(branding);
    } catch (error) {
      res.status(500).json({ message: "Failed to save branding", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/branding/logo", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // TODO: Uncomment plan gate when ready to implement
      // plan gate using hardened getUserFeatures
      // const { getUserFeatures } = await import("./lib/plan-features");
      // const features = await getUserFeatures(userId);
      
      // if (!features.customBranding) {
      //   return res.status(403).json({ message: "Logo upload not available in your plan" });
      // }

      // Check if this is an edit (no new file upload) or new upload
      const isEdit = req.body.isEdit === 'true';
      const file = req.file;
      
      if (!isEdit && !file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Ensure branding record exists; create default if missing
      let existingBranding = await storage.getBranding(userId);
      if (!existingBranding) {
        existingBranding = await storage.createBranding({
          userId,
          primary: '#0053F1',
          secondary: '#64748B',
          accent: '#121212', // Text color maps to accent
          logoUrl: undefined,
          profilePictureUrl: undefined,
          displayName: undefined,
          showDisplayName: true,
          showProfilePicture: true,
          usePlatformBranding: true,
        });
      }

      let logoUrl = existingBranding?.logoUrl;
      
      // If new file is uploaded, delete old logo and upload new one
      if (file) {
        if (!["image/png","image/jpeg","image/gif"].includes(file.mimetype)) {
          return res.status(400).json({ message: "Only PNG/JPG/GIF allowed" });
        }

        // Delete old logo from DO Spaces if it exists
        if (existingBranding?.logoUrl && isSpacesUrl(existingBranding.logoUrl)) {
          await deleteFile(existingBranding.logoUrl);
        }

        // Upload original image to Digital Ocean Spaces
        const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/gif" ? "gif" : "jpg";
        const filename = `logo-${userId}-${Date.now()}.${ext}`;

        logoUrl = await uploadFile({
          fileBuffer: file.buffer,
          fileName: filename,
          folder: 'business_logos',
          contentType: file.mimetype,
        });
      }

      // Parse crop data if provided
      let logoCropData = null;
      console.log('BACKEND - Logo crop data received:', req.body.cropData);
      if (req.body.cropData) {
        try {
          logoCropData = JSON.parse(req.body.cropData);
          console.log('BACKEND - Parsed logo crop data:', JSON.stringify(logoCropData));
        } catch (e) {
          console.error('Error parsing logo crop data:', e);
        }
      } else {
        console.log('BACKEND - No crop data in request body for logo');
      }

      await storage.updateBranding(userId, {
        logoUrl: logoUrl || undefined,
        logoCropData: logoCropData || undefined,
        updatedAt: Date.now()
      });

      console.log('BACKEND - Returning logo response:', { 
        logoUrl, 
        logoCropData: logoCropData ? 'present' : 'null',
        logoCropDataDetails: logoCropData 
      });
      return res.json({ logoUrl, logoCropData });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Upload failed" });
    }
  });

  // Delete branding logo
  app.delete("/api/branding/logo", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      const existing = await storage.getBranding(userId);
      const currentUrl = existing?.logoUrl;

      console.log('BACKEND - Delete logo - currentUrl:', currentUrl);
      console.log('BACKEND - Delete logo - isSpacesUrl:', currentUrl ? isSpacesUrl(currentUrl) : 'N/A');

      if (currentUrl && isSpacesUrl(currentUrl)) {
        console.log('BACKEND - Deleting file from Digital Ocean:', currentUrl);
        const deleted = await deleteFile(currentUrl);
        console.log('BACKEND - File deletion result:', deleted);
      } else {
        console.log('BACKEND - Skipping file deletion (not a Spaces URL or no URL)');
      }

      // Use clearBrandingField to properly clear logoUrl and logoCropData from database
      console.log('BACKEND - Clearing logoUrl and logoCropData from database...');
      await storage.clearBrandingField(userId, 'logoUrl');
      console.log('BACKEND - Database updated, logo and crop data cleared');
      return res.json({ success: true });
    } catch (e: any) {
      console.error('BACKEND - Delete logo error:', e);
      return res.status(500).json({ message: e?.message ?? "Delete failed" });
    }
  });

  app.post("/api/branding/profile", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // TODO: Uncomment plan gate when ready to implement
      // plan gate using hardened getUserFeatures
      // const { getUserFeatures } = await import("./lib/plan-features");
      // const features = await getUserFeatures(userId);
      
      // if (!features.customBranding) {
      //   return res.status(403).json({ message: "Profile picture upload not available in your plan" });
      // }

      // Check if this is an edit (no new file upload) or new upload
      const isEdit = req.body.isEdit === 'true';
      const file = req.file;
      
      if (!isEdit && !file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Ensure branding record exists; create default if missing
      let existingBranding = await storage.getBranding(userId);
      if (!existingBranding) {
        existingBranding = await storage.createBranding({
          userId,
          primary: '#0053F1',
          secondary: '#64748B',
          accent: '#121212', // Text color maps to accent
          logoUrl: undefined,
          profilePictureUrl: undefined,
          displayName: undefined,
          showDisplayName: true,
          showProfilePicture: true,
          usePlatformBranding: true,
        });
      }

      let profilePictureUrl = existingBranding?.profilePictureUrl;
      
      // If new file is uploaded, delete old profile picture and upload new one
      if (file) {
        if (!["image/png","image/jpeg","image/gif"].includes(file.mimetype)) {
          return res.status(400).json({ message: "Only PNG/JPG/GIF allowed" });
        }

        // Delete old profile picture from DO Spaces if it exists
        if (existingBranding?.profilePictureUrl && isSpacesUrl(existingBranding.profilePictureUrl)) {
          await deleteFile(existingBranding.profilePictureUrl);
        }

        // Upload original image to Digital Ocean Spaces
        const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/gif" ? "gif" : "jpg";
        const filename = `profile-${userId}-${Date.now()}.${ext}`;

        profilePictureUrl = await uploadFile({
          fileBuffer: file.buffer,
          fileName: filename,
          folder: 'profile_pictures',
          contentType: file.mimetype,
        });
      }

      // Parse crop data if provided
      let profileCropData = null;
      console.log('BACKEND - Profile crop data received:', req.body.cropData);
      if (req.body.cropData) {
        try {
          profileCropData = JSON.parse(req.body.cropData);
          console.log('BACKEND - Parsed profile crop data:', JSON.stringify(profileCropData));
        } catch (e) {
          console.error('Error parsing profile crop data:', e);
        }
      } else {
        console.log('BACKEND - No crop data in request body');
      }

      await storage.updateBranding(userId, { 
        profilePictureUrl: profilePictureUrl || undefined,
        profileCropData: profileCropData || undefined,
        updatedAt: Date.now() 
      });
      
      console.log('BACKEND - Returning profile response:', { 
        profilePictureUrl, 
        profileCropData: profileCropData ? 'present' : 'null',
        profileCropDataDetails: profileCropData 
      });
      return res.json({ profilePictureUrl, profileCropData });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Upload failed" });
    }
  });

  // Delete profile picture
  app.delete("/api/branding/profile", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      const existing = await storage.getBranding(userId);
      const currentUrl = existing?.profilePictureUrl;

      console.log('BACKEND - Delete profile - currentUrl:', currentUrl);
      console.log('BACKEND - Delete profile - isSpacesUrl:', currentUrl ? isSpacesUrl(currentUrl) : 'N/A');

      if (currentUrl && isSpacesUrl(currentUrl)) {
        console.log('BACKEND - Deleting file from Digital Ocean:', currentUrl);
        const deleted = await deleteFile(currentUrl);
        console.log('BACKEND - File deletion result:', deleted);
      } else {
        console.log('BACKEND - Skipping file deletion (not a Spaces URL or no URL)');
      }

      // Use clearBrandingField to properly clear profilePictureUrl and profileCropData from database
      console.log('BACKEND - Clearing profilePictureUrl and profileCropData from database...');
      await storage.clearBrandingField(userId, 'profilePictureUrl');
      console.log('BACKEND - Database updated, profile picture and crop data cleared');
      return res.json({ success: true });
    } catch (e: any) {
      console.error('BACKEND - Delete profile error:', e);
      return res.status(500).json({ message: e?.message ?? "Delete failed" });
    }
  });

  // User Subscriptions API Routes (enhanced with features)
  app.get("/api/user-subscriptions/me", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      // Get user subscription and plan
      const subscription = await storage.getUserSubscription(userId);
      const plan = subscription ? await storage.getSubscriptionPlan(subscription.planId) : null;
      
      // Resolve user features using the new feature system
      const { getUserFeatures } = await import("./lib/plan-features");
      const features = await getUserFeatures(userId);
      
      res.json({ 
        subscription,
        plan,
        features
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user subscription", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/user-subscriptions", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Create subscription data, enforcing userId from session to prevent privilege escalation
      const subscriptionData = insertUserSubscriptionSchema.parse({
        ...req.body,
        userId: session.userId // Server-side override prevents horizontal privilege escalation
      });
      
      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(session.userId);
      if (existingSubscription) {
        return res.status(409).json({ message: "User already has an active subscription" });
      }
      
      const subscription = await storage.createUserSubscription(subscriptionData);
      res.json({ message: "User subscription created successfully", subscription });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user subscription data", error: error.issues });
      }
      res.status(500).json({ message: "Failed to create user subscription", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/user-subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const subscriptionId = req.params.id;
      
      // Create update schema that excludes system-managed fields and userId to prevent privilege escalation
      const updateSubscriptionSchema = insertUserSubscriptionSchema.partial();
      
      const parseResult = updateSubscriptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid update data", error: parseResult.error.issues });
      }
      
      // Get existing subscription to verify ownership
      const existingSubscription = await storage.getUserSubscription(session.userId);
      if (!existingSubscription || existingSubscription._id !== subscriptionId) {
        return res.status(404).json({ message: "Subscription not found or access denied" });
      }
      
      // Filter out userId to prevent privilege escalation (id, createdAt, updatedAt already excluded by schema)
      const updateData = { ...parseResult.data };
      if ('userId' in updateData) {
        delete updateData.userId;
      }
      const updatedSubscription = await storage.updateUserSubscription(subscriptionId, updateData);
      res.json({ message: "User subscription updated successfully", subscription: updatedSubscription });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user subscription", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  /* FOR TESTING PURPOSES - COMMENTED OUT FOR PRODUCTION
  // Test endpoint to toggle between free and pro plan without Stripe
  app.post("/api/subscription/test-toggle", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const { planId } = req.body;

      if (!planId || (planId !== "free" && planId !== "pro")) {
        return res.status(400).json({ message: "planId must be 'free' or 'pro'" });
      }

      // Get existing subscription
      let existingSubscription = await storage.getUserSubscription(userId);

      if (existingSubscription) {
        // Update existing subscription
        await storage.updateUserSubscription(userId, {
          planId: planId,
          status: planId === "pro" ? "active" : "inactive",
          updatedAt: Date.now(),
        });
      } else {
        // Create new subscription
        const subscriptionData: any = {
          userId: userId,
          planId: planId,
          status: planId === "pro" ? "active" : "inactive",
          isAnnual: false,
          updatedAt: Date.now(),
        };
        await storage.createUserSubscription(subscriptionData);
      }

      // Fetch updated subscription
      const updatedSubscription = await storage.getUserSubscription(userId);
      res.json({
        message: `Successfully switched to ${planId} plan`,
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error("Error toggling subscription:", error);
      res.status(500).json({
        message: "Failed to toggle subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  */

  // Free Plan Assignment
  app.post("/api/subscription/free", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // Get or create subscription for this user
      let sub = await storage.getUserSubscription(userId);
      
      if (sub) {
        // Update existing subscription to free plan
        await storage.updateUserSubscription(userId, {
          planId: "free",
          status: "active",
          // Do not explicitly set stripeSubscriptionId to null; omit instead
        });
      } else {
        // Create new free subscription
        const payload: any = {
          userId,
          planId: "free",
          status: "active",
        };
        await storage.createUserSubscription(payload);
      }

      res.json({ success: true, message: "Free plan assigned successfully" });
    } catch (error) {
      console.error("Free plan assignment error:", error);
      res.status(500).json({ message: "Failed to assign free plan" });
    }
  });

  // Stripe Checkout Session API
  app.post("/api/checkout/start", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const validatedData = checkoutStartSchema.parse(req.body);
      const { planId, interval, couponId, promotionCode } = validatedData;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan?.isActive) {
        return res.status(404).json({ message: "Plan not found or inactive" });
      }

      let priceId = interval === "year" ? plan.stripePriceYearly : plan.stripePriceMonthly;
      
      // If no Stripe price exists, create it
      if (!priceId) {
        const { ensureStripePrices } = await import('./lib/stripe');
        const prices = await ensureStripePrices({
          id: plan._id,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          stripePriceMonthly: plan.stripePriceMonthly,
          stripePriceYearly: plan.stripePriceYearly
        });
        
        // Update the plan in database with new price IDs
        if (prices.monthly && interval === "month") {
          await storage.updateSubscriptionPlan(planId, { stripePriceMonthly: prices.monthly });
          priceId = prices.monthly;
        } else if (prices.yearly && interval === "year") {
          await storage.updateSubscriptionPlan(planId, { stripePriceYearly: prices.yearly });
          priceId = prices.yearly;
        }
        
        if (!priceId) {
          return res.status(400).json({ message: "Plan interval not purchasable" });
        }
      }

      // ensure stripe customer
      let sub = await storage.getUserSubscription(userId);
      let customerId = sub?.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({ metadata: { userId } });
        customerId = customer.id;
        
        if (sub) {
          sub = await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
        } else {
          const payload: any = {
            userId,
            planId,
            stripeCustomerId: customerId,
            isAnnual: interval === "year",
            status: "inactive",
          };
          await storage.createUserSubscription(payload);
        }
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const success = `${frontendUrl}/billing?success=1`;
      const cancel = `${frontendUrl}/billing?canceled=1`;

      const checkoutOptions: any = {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: success,
        cancel_url: cancel,
        metadata: { userId, planId },
        allow_promotion_codes: true, // Enable promotion code entry in Stripe checkout UI
      };

      // If a specific coupon or promotion code is provided, apply it
      if (couponId) {
        checkoutOptions.discounts = [{ coupon: couponId }];
      } else if (promotionCode) {
        checkoutOptions.discounts = [{ promotion_code: promotionCode }];
      }

      const checkout = await stripe.checkout.sessions.create(checkoutOptions);

      // DO NOT update subscription here - wait for webhook confirmation
      // The subscription will only be activated after successful payment via webhook

      return res.json({ url: checkout.url });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Checkout error" });
    }
  });

  // Validate and retrieve coupon/promotion code details
  app.post("/api/checkout/validate-coupon", requireAuth, async (req, res) => {
    try {
      const validatedData = validateCouponSchema.parse(req.body);
      const { code } = validatedData;

      try {
        // First, try to find it as a promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: code.toUpperCase(),
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          const promoCode = promotionCodes.data[0];
          const coupon = promoCode.coupon;
          
          return res.json({
            valid: true,
            type: 'promotion_code',
            id: promoCode.id,
            code: promoCode.code,
            discount: {
              percentOff: coupon.percent_off,
              amountOff: coupon.amount_off,
              currency: coupon.currency,
              duration: coupon.duration,
              durationInMonths: coupon.duration_in_months,
            },
          });
        }

        // If not found as promotion code, try as direct coupon ID
        const coupon = await stripe.coupons.retrieve(code);
        
        if (coupon && coupon.valid) {
          return res.json({
            valid: true,
            type: 'coupon',
            id: coupon.id,
            code: coupon.id,
            discount: {
              percentOff: coupon.percent_off,
              amountOff: coupon.amount_off,
              currency: coupon.currency,
              duration: coupon.duration,
              durationInMonths: coupon.duration_in_months,
            },
          });
        }

        return res.status(404).json({ 
          valid: false, 
          message: "Invalid or expired coupon code" 
        });
      } catch (err: any) {
        if (err.code === 'resource_missing') {
          return res.status(404).json({ 
            valid: false, 
            message: "Invalid or expired coupon code" 
          });
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ 
        message: e?.message ?? "Error validating coupon" 
      });
    }
  });

  // Get payment method details
  app.get("/api/billing/payment-method", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // Get user's subscription
      const userSubscription = await storage.getUserSubscription(userId);
      if (!userSubscription?.stripeCustomerId) {
        return res.json({ paymentMethod: null });
      }

      // Fetch payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: userSubscription.stripeCustomerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        return res.json({ paymentMethod: null });
      }

      // Get the first (default) payment method
      const pm = paymentMethods.data[0];
      return res.json({
        paymentMethod: {
          brand: pm.card?.brand || 'card',
          last4: pm.card?.last4 || '****',
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        }
      });
    } catch (e: any) {
      console.error('Error fetching payment method:', e);
      return res.status(500).json({ message: e?.message ?? "Failed to fetch payment method" });
    }
  });

  // Stripe Customer Portal for payment method management
  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // Get user's Stripe customer ID
      const userSubscription = await storage.getUserSubscription(userId);
      if (!userSubscription?.stripeCustomerId) {
        return res.status(400).json({
          message: "No payment method found. Please upgrade to a paid plan first."
        });
      }

      const returnUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const billingUrl = `${returnUrl}/billing`;

      // Create customer portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: billingUrl,
      });

      return res.json({ url: portalSession.url });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Portal creation error" });
    }
  });

  // Stripe Customer Portal for subscription cancellation
  app.post("/api/billing/portal/cancel", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // Get user's Stripe customer ID and subscription
      const userSubscription = await storage.getUserSubscription(userId);
      if (!userSubscription?.stripeCustomerId) {
        return res.status(400).json({
          message: "No payment method found. Please upgrade to a paid plan first."
        });
      }

      if (!userSubscription?.stripeSubscriptionId) {
        return res.status(400).json({
          message: "No active subscription found."
        });
      }

      const returnUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const billingUrl = `${returnUrl}/billing`;

      // Create customer portal session with cancellation flow
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: billingUrl,
        flow_data: {
          type: 'subscription_cancel',
          subscription_cancel: {
            subscription: userSubscription.stripeSubscriptionId,
          },
        },
      });

      return res.json({ url: portalSession.url });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Portal creation error" });
    }
  });

  // ========== Stripe Connect Routes ==========

  // Initiate Stripe Connect OAuth flow
  app.get("/api/stripe/connect", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Build Stripe OAuth URL
      const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
      const redirectUri = `${process.env.BASE_URL}/api/stripe/callback`;

      if (!clientId) {
        console.error('STRIPE_CONNECT_CLIENT_ID is not configured');
        return res.status(500).json({ message: "Stripe Connect is not configured" });
      }

      const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;

      // Redirect user to Stripe OAuth
      return res.redirect(stripeOAuthUrl);
    } catch (error: any) {
      console.error('Error initiating Stripe Connect:', error);
      return res.status(500).json({ message: error.message || "Failed to initiate Stripe Connect" });
    }
  });

  // Handle Stripe Connect OAuth callback
  app.get("/api/stripe/callback", async (req, res) => {
    try {
      const { code, state: userId, error } = req.query;

      if (error) {
        console.error('Stripe OAuth error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/payments?error=${encodeURIComponent(error as string)}`);
      }

      if (!code || !userId) {
        return res.status(400).json({ message: "Missing authorization code or user ID" });
      }

      // Exchange authorization code for access token
      const tokenResponse = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code: code as string,
      });

      // Extract credentials
      const {
        stripe_user_id: stripeAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        scope,
      } = tokenResponse;

      console.log('Stripe Connect successful for user:', userId);
      console.log('Stripe Account ID:', stripeAccountId);

      // Update user in Convex with Stripe Connect credentials
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(user._id, {
        stripeAccountId,
        stripeAccessToken: accessToken,
        stripeRefreshToken: refreshToken,
        stripeScope: scope,
      });

      console.log('Stripe credentials saved to database for user:', userId);

      // Redirect back to frontend Payments page with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payments?connected=true`);
    } catch (error: any) {
      console.error('Error in Stripe Connect callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payments?error=${encodeURIComponent(error.message || 'Connection failed')}`);
    }
  });

  // Disconnect Stripe Connect account
  app.post("/api/stripe/disconnect", async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user to retrieve Stripe account ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeAccountId) {
        return res.status(400).json({ message: "Stripe account not connected" });
      }

      // Deauthorize the Stripe Connect account to revoke access
      try {
        const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
        if (clientId) {
          await stripe.oauth.deauthorize({
            client_id: clientId,
            stripe_user_id: user.stripeAccountId,
          });
          console.log(`✅ Stripe account deauthorized: ${user.stripeAccountId}`);
        } else {
          console.warn('⚠️ STRIPE_CONNECT_CLIENT_ID not configured, skipping deauthorization');
        }
      } catch (deauthError: any) {
        console.warn(`⚠️ Failed to deauthorize Stripe account (${deauthError.message}), continuing with disconnect`);
        // Continue with disconnect even if deauthorize fails
      }

      // Clear Stripe credentials from user
      await storage.updateUser(user._id, {
        stripeAccountId: undefined,
        stripeAccessToken: undefined,
        stripeRefreshToken: undefined,
        stripeScope: undefined,
      });

      console.log(`✅ Stripe credentials cleared for user: ${userId}`);
      res.json({ success: true, message: "Stripe account disconnected successfully" });
    } catch (error: any) {
      console.error('Error disconnecting Stripe:', error);
      res.status(500).json({ message: "Failed to disconnect Stripe account", error: error.message });
    }
  });

  // Get Stripe Connect status for current user
  app.get("/api/stripe/status", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Fetch user from Convex
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isConnected = !!user.stripeAccountId;

      return res.json({
        isConnected,
        stripeAccountId: user.stripeAccountId || null,
      });
    } catch (error: any) {
      console.error('Error checking Stripe Connect status:', error);
      return res.status(500).json({ message: error.message || "Failed to check Stripe status" });
    }
  });

  // ========== End Stripe Connect Routes ==========

  // Create Stripe checkout session for booking payment
  app.post("/api/public-bookings/checkout", async (req, res) => {
    try {
      const { userId, appointmentTypeId, bookingData } = req.body;

      if (!userId || !appointmentTypeId || !bookingData) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get appointment type and verify it belongs to user
      const appointmentType = await storage.getAppointmentType(appointmentTypeId);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }
      if (appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Appointment type does not belong to this user" });
      }

      // Check if payment is required
      if (!appointmentType.requirePayment) {
        return res.status(400).json({ message: "Payment is not required for this service" });
      }

      // Check if user has Stripe connected
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeAccountId) {
        return res.status(400).json({ message: "Stripe account not connected" });
      }

      if (!user.stripeAccessToken) {
        return res.status(400).json({ message: "Stripe access token not found. Please reconnect your Stripe account." });
      }

      // Get service price (convert to cents if needed)
      const priceInCents = appointmentType.price ? Math.round(appointmentType.price * 100) : 0;
      if (priceInCents <= 0) {
        return res.status(400).json({ message: "Service price is not set" });
      }

      // Create Stripe checkout session on behalf of connected account
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const successUrl = `${frontendUrl}/${user.slug || userId}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/${user.slug || userId}?payment=canceled`;

      // Use PLATFORM Stripe instance with connected account ID
      // This allows webhooks to be received by the platform, not the connected account
      const Stripe = (await import('stripe')).default;
      const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

      // Create checkout session on connected account via platform
      const checkoutSession = await platformStripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: appointmentType.name,
                description: `Booking for ${appointmentType.name}`,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_intent_data: {
          // Money goes directly to connected account (no platform fee)
          application_fee_amount: 0,
        },
        metadata: {
          userId,
          appointmentTypeId,
          bookingData: JSON.stringify(bookingData),
        },
      }, {
        stripeAccount: user.stripeAccountId, // Pass connected account ID
      });

      return res.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
    } catch (error: any) {
      console.error('Error creating booking checkout session:', error);
      return res.status(500).json({ message: error.message || "Failed to create checkout session" });
    }
  });

  // Complete booking after successful payment
  app.post("/api/public-bookings/complete", async (req, res) => {
    try {
      const { sessionId, bookingData } = req.body;

      if (!sessionId || !bookingData) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify the checkout session was successful
      // Note: In production, you should verify this via webhook for security
      // For now, we'll trust the frontend but you should add webhook verification

      // Create the booking using the same logic as /api/public-bookings
      const validatedData = insertBookingSchema.parse(bookingData);
      
      // Additional validation
      if (!validatedData.customerName?.trim()) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      if (!validatedData.customerEmail?.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      const userId = validatedData.userId;
      const appointmentType = await storage.getAppointmentType(validatedData.appointmentTypeId);
      if (!appointmentType) {
        return res.status(404).json({ message: "Appointment type not found" });
      }

      const appointmentDate = new Date(validatedData.appointmentDate);
      const appointmentDuration = appointmentType.duration || 30;
      const durationMs = appointmentDuration * 60 * 1000;
      const appointmentEnd = new Date(appointmentDate.getTime() + durationMs);

      // Check for conflicts (same as in /api/public-bookings)
      const blockedDates = await storage.getBlockedDatesByUser(userId);
      const hasBlockedConflict = blockedDates.some(blocked => {
        const blockStart = new Date(blocked.startDate);
        let blockEnd = new Date(blocked.endDate);
        if (blocked.isAllDay) {
          blockEnd.setHours(23, 59, 59, 999);
        }
        return appointmentDate < blockEnd && appointmentEnd > blockStart;
      });

      if (hasBlockedConflict) {
        return res.status(409).json({ 
          message: "The selected date and time is no longer available. Please choose a different time slot." 
        });
      }

      // Exclude cancelled and deleted bookings - they don't block time slots
      const existingUserBookings = await storage.getBookingsByUser(userId);
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const sameDay = existingUserBookings.filter(booking => {
        // Only check active bookings (not cancelled or deleted)
        if (booking.status === 'cancelled' || booking.status === 'deleted') {
          return false;
        }
        const bookingDate = new Date(booking.appointmentDate).toISOString().split('T')[0];
        return bookingDate === dateStr;
      });

      const hasBookingConflict = sameDay.some(existing => {
        const existingStart = new Date(existing.appointmentDate);
        const existingEnd = new Date(existingStart.getTime() + (existing.duration || 30) * 60 * 1000);
        return appointmentDate < existingEnd && appointmentEnd > existingStart;
      });

      if (hasBookingConflict) {
        return res.status(409).json({ 
          message: "The selected time slot is no longer available. Please choose a different time." 
        });
      }
      
      const booking = await storage.createBooking(validatedData);

      if (!booking) {
        return res.status(500).json({ message: "Failed to create booking" });
      }

      // Handle intake form submission if formSessionId is provided
      if (validatedData.formSessionId) {
        try {
          const tempSubmission = await storage.getTempFormSubmissionBySession(validatedData.formSessionId);
          if (tempSubmission) {
            let newFileUrls: string[] = [];
            if (tempSubmission.fileUrls && tempSubmission.fileUrls.length > 0) {
              const { moveIntakeFormFiles } = await import('./services/spaces');
              newFileUrls = await moveIntakeFormFiles(tempSubmission.fileUrls, booking._id);
            }

            // Update responses with new file URLs
            const updatedResponses = tempSubmission.responses.map((response: any) => {
              if (response.fileUrls && response.fileUrls.length > 0) {
                const fieldFileUrls = newFileUrls.filter((url: string) => 
                  tempSubmission.fileUrls?.includes(url)
                );
                return { ...response, fileUrls: fieldFileUrls };
              }
              return response;
            });

            await storage.finalizeFormSubmission(booking._id, tempSubmission.intakeFormId, updatedResponses);
          }
        } catch (formError) {
          console.error('Error processing intake form:', formError);
          // Don't fail the booking if form processing fails
        }
      }

      return res.json({
        message: "Booking created successfully",
        booking,
        appointmentType,
        paymentSessionId: sessionId
      });
    } catch (error: any) {
      console.error('Error completing booking:', error);
      return res.status(500).json({ message: error.message || "Failed to complete booking" });
    }
  });

  // Stripe Webhooks with signature verification
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) {
        return res.status(400).send("Missing signature");
      }

      let event;
      try {
        // Verify webhook signature using raw body
        event = stripe.webhooks.constructEvent(
          req.body, // raw Buffer from express.raw()
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId || "pro";

          if (userId && subscriptionId) {
            // Get subscription details to determine if annual or monthly
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price?.id;
            
            // Determine if annual based on price interval
            let isAnnual = false;
            if (priceId) {
              const price = await stripe.prices.retrieve(priceId);
              isAnnual = price.recurring?.interval === "year";
            }

            // Explicit upgrade to Pro plan
            await storage.updateUserSubscription(userId, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              planId: planId,
              isAnnual: isAnnual,
              status: "active",
            });
            console.log(`✅ Upgraded user ${userId} to ${planId} (${isAnnual ? 'Annual' : 'Monthly'})`);
          } else if (subscriptionId) {
            // Fallback to existing logic if no userId in metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await upsertSubscriptionFromStripe(customerId, subscription);
          }
          break;
        }
        
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;

          // Find user by Stripe customer ID and downgrade to Free
          const allSubscriptions = await storage.getAllUserSubscriptions();
          const userSub = allSubscriptions.find((sub: any) => sub.stripeCustomerId === customerId);
          if (userSub) {
            await storage.updateUserSubscription(userSub.userId, {
              planId: "free",
              status: "active",
              stripeSubscriptionId: undefined,
            });
            console.log(`⚠️ Downgraded user ${userSub.userId} to Free`);
          }
          break;
        }
        
        case "customer.subscription.updated":
        case "customer.subscription.created": {
          const subscription = event.data.object as any;
          await upsertSubscriptionFromStripe(subscription.customer as string, subscription);
          break;
        }
        
        default: 
          console.log(`Unhandled Stripe event type: ${event.type}`);
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({ message: "Webhook handling failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Helper function to update subscription from Stripe data
  async function upsertSubscriptionFromStripe(customerId: string, subscription: any) {
    try {
      // Find user by Stripe customer ID
      const allSubscriptions = await storage.getAllUserSubscriptions();
      const userSubscription = allSubscriptions.find((sub: any) => sub.stripeCustomerId === customerId);
      if (!userSubscription) {
        console.log(`No user found for Stripe customer ID: ${customerId}`);
        return;
      }

      const updates: any = {
        status: subscription.status,
        stripeSubscriptionId: subscription.id || subscription._id,
        renewsAt: subscription.current_period_end ? subscription.current_period_end * 1000 : undefined,
        cancelAt: subscription.cancel_at ? subscription.cancel_at * 1000 : undefined,
      };

      // Store start date from Stripe (created timestamp)
      if (subscription.created && !userSubscription.startDate) {
        updates.startDate = subscription.created * 1000;
      }

      await storage.updateUserSubscription(userSubscription.userId, updates);

      console.log(`Updated subscription for user ${userSubscription.userId}: ${subscription.status}`);
    } catch (error) {
      console.error('Error updating subscription from Stripe:', error);
    }
  }

  // Enhanced admin stats route with comprehensive analytics
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      // Get real platform data
      const allUsers = await storage.getAllUsers();
      const allBookings = await storage.getAllBookings();
      const allUserSubscriptions = await storage.getAllUserSubscriptions();
      const allPlans = await storage.getAllSubscriptionPlans();
      
      console.log('[Admin Stats] Fetched data:', {
        users: allUsers.length,
        bookings: allBookings.length,
        subscriptions: allUserSubscriptions.length,
        plans: allPlans.length
      });
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Basic metrics
      const totalUsers = allUsers.length;
      const activeSubscriptions = allUserSubscriptions.filter(sub => sub.status === "active").length;
      const totalBookings = allBookings.length;
      
      // User engagement analytics
      const newUsersThisMonth = allUsers.filter(user => {
        const userDate = new Date(user._creationTime);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).length;
      
      const newUsersLastMonth = allUsers.filter(user => {
        const userDate = new Date(user._creationTime);
        return userDate.getMonth() === lastMonth && userDate.getFullYear() === lastMonthYear;
      }).length;
      
      // Active users (users with bookings in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const activeUsers = allUsers.filter(user => {
        const userBookings = allBookings.filter(booking => 
          booking.userId === user._id && new Date(booking._creationTime) > thirtyDaysAgo
        );
        return userBookings.length > 0;
      }).length;
      
      // Revenue analytics
      let monthlyRevenue = 0;
      let monthlyRevenueLastMonth = 0;
      
      for (const subscription of allUserSubscriptions) {
        if (subscription.status === "active") {
          const plan = allPlans.find(p => p._id === subscription.planId);
          if (plan && plan.priceMonthly && plan.priceMonthly > 0) {
            monthlyRevenue += plan.priceMonthly;
            
            // Check if subscription was active last month too
            const subDate = new Date(subscription._creationTime);
            if (subDate.getMonth() <= lastMonth && subDate.getFullYear() <= lastMonthYear) {
              monthlyRevenueLastMonth += plan.priceMonthly;
            }
          }
        }
      }
      
      // Convert from cents to dollars
      monthlyRevenue = monthlyRevenue / 100;
      monthlyRevenueLastMonth = monthlyRevenueLastMonth / 100;
      
      // Growth calculations
      const userGrowthRate = newUsersLastMonth > 0 ? 
        ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100) : 0;
      const revenueGrowthRate = monthlyRevenueLastMonth > 0 ? 
        ((monthlyRevenue - monthlyRevenueLastMonth) / monthlyRevenueLastMonth * 100) : 0;
      
      // Churn rate (users who cancelled subscriptions this month)
      const cancelledSubscriptions = allUserSubscriptions.filter(sub => {
        if (sub.status === "cancelled" && sub.updatedAt) {
          const cancelDate = new Date(sub.updatedAt);
          return cancelDate.getMonth() === currentMonth && cancelDate.getFullYear() === currentYear;
        }
        return false;
      }).length;
      
      const churnRate = activeSubscriptions > 0 ? (cancelledSubscriptions / activeSubscriptions * 100) : 0;
      
      // Average revenue per user (ARPU)
      const arpu = totalUsers > 0 ? monthlyRevenue / totalUsers : 0;
      
      // Plan distribution
      // Get admin user IDs to exclude from counts
      const adminUserIds = allUsers.filter(user => user.isAdmin).map(user => user._id);
      
      // Get all non-admin user IDs
      const nonAdminUserIds = allUsers.filter(user => !user.isAdmin).map(user => user._id);
      
      const planDistribution = allPlans.map(plan => {
        let subscriptions = 0;
        
        if (plan.planId === "free") {
          // For free plan: count all non-admin users who either:
          // 1. Have no subscription record, OR
          // 2. Have a subscription with planId "free" and status "active"
          subscriptions = nonAdminUserIds.filter(userId => {
            const userSub = allUserSubscriptions.find(sub => sub.userId === userId);
            return !userSub || (userSub.planId === "free" && userSub.status === "active");
          }).length;
        } else {
          // For other plans (pro): count non-admin users with matching planId and active status
          subscriptions = allUserSubscriptions.filter(sub => {
            const userIsAdmin = adminUserIds.includes(sub.userId);
            return sub.planId === plan.planId && sub.status === "active" && !userIsAdmin;
          }).length;
        }
        
        return {
          planName: plan.name,
          subscriptions,
          revenue: (subscriptions * (plan.priceMonthly || 0)) / 100
        };
      });
      
      // Booking trends (last 6 months)
      const bookingTrends = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const bookingsInMonth = allBookings.filter(booking => {
          const bookingDate = new Date(booking._creationTime);
          return bookingDate.getMonth() === targetDate.getMonth() && 
                 bookingDate.getFullYear() === targetDate.getFullYear();
        }).length;
        
        bookingTrends.push({
          month: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bookings: bookingsInMonth
        });
      }
      
      // User acquisition trends (last 6 months)
      const userTrends = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const usersInMonth = allUsers.filter(user => {
          const userDate = new Date(user._creationTime);
          return userDate.getMonth() === targetDate.getMonth() && 
                 userDate.getFullYear() === targetDate.getFullYear();
        }).length;
        
        userTrends.push({
          month: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          users: usersInMonth
        });
      }
      
      res.json({
        // Basic metrics
        totalUsers,
        activeSubscriptions,
        totalBookings,
        monthlyRevenue,
        
        // Engagement metrics
        newUsersThisMonth,
        activeUsers,
        
        // Growth metrics
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
        revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        arpu: Math.round(arpu * 100) / 100,
        
        // Trend data for charts
        bookingTrends,
        userTrends,
        planDistribution
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin users management endpoint
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allBookings = await storage.getAllBookings();
      const allUserSubscriptions = await storage.getAllUserSubscriptions();
      const allPlans = await storage.getAllSubscriptionPlans();
      
      console.log('[Admin Users] Fetched data:', {
        users: allUsers.length,
        bookings: allBookings.length,
        subscriptions: allUserSubscriptions.length,
        plans: allPlans.length
      });
      
      // Format user data for admin interface
      const usersWithDetails = allUsers.map(user => {
        const userBookings = allBookings.filter(booking => booking.userId === user._id);
        const userSubscription = allUserSubscriptions.find(sub => sub.userId === user._id);
        // Map planId to display name: "free" -> "Free", "pro" -> "Pro"
        let planDisplayName = "Free";
        if (userSubscription?.planId) {
          const planId = userSubscription.planId.toLowerCase();
          planDisplayName = planId === "pro" ? "Pro" : "Free";
        }
        
        console.log(`[Admin Users] User ${user.email}: subscription planId=${userSubscription?.planId}, display plan=${planDisplayName}`);
        
        return {
          id: user._id,
          name: user.name || 'No Name', // User's actual name
          businessName: user.businessName || '', // Keep business name for reference if needed
          email: user.email,
          industry: user.industry || null, // Industry from onboarding
          plan: planDisplayName,
          bookingCount: userBookings.length,
          joinDate: user._creationTime ? new Date(user._creationTime).toLocaleDateString() : new Date().toLocaleDateString(),
          status: user.isAdmin ? "Admin" : "Active"
        };
      });
      
      res.json(usersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin get user subscription endpoint
  app.get("/api/admin/users/:id/subscription", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        // Return default values if subscription doesn't exist
        return res.json({
          plan: "Free",
          startDate: null,
          nextBillingDate: null,
          lifetimeSpend: 0,
        });
      }

      // Format the response
      // Use _creationTime as fallback for startDate if not set
      const startDate = subscription.startDate || (subscription as any)._creationTime || null;
      
      const response = {
        plan: subscription.planId === "pro" ? "Pro" : "Free",
        startDate: startDate,
        nextBillingDate: subscription.renewsAt || null,
        lifetimeSpend: subscription.lifetimeSpend || 0,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin update user subscription endpoint
  app.put("/api/admin/users/:id/subscription", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { plan } = req.body;

      if (!plan || !["Free", "Pro", "free", "pro"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Must be 'Free' or 'Pro'" });
      }

      const planId = plan.toLowerCase();
      const subscription = await storage.getUserSubscription(userId);

      if (!subscription) {
        // Create new subscription if it doesn't exist
        await storage.createUserSubscription({
          userId,
          planId,
          status: planId === "pro" ? "active" : "active",
          isAnnual: false,
        });
      } else {
        // Update existing subscription
        await storage.updateUserSubscription(userId, {
          planId,
          status: planId === "pro" ? "active" : "active",
        });
      }

      res.json({ message: "Subscription updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin user suspension endpoint
  app.patch("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { suspend } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // For now, we'll simulate suspension by adding a "suspended" flag
      // In a real app, you might have a separate suspended field or status
      const updatedUser = await storage.updateUser(userId, { 
        // Note: This is a demo implementation - you'd want a proper suspended field in the schema
        businessName: suspend ? `[SUSPENDED] ${user.businessName}` : user.businessName?.replace('[SUSPENDED] ', '') || user.businessName
      });
      
      res.json({ 
        message: `User ${suspend ? 'suspended' : 'reactivated'} successfully`,
        user: updatedUser 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin update user profile endpoint
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { name, email, status } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prepare update object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (status !== undefined) {
        // Map "Active"/"Inactive" to "active"/"inactive"
        updateData.accountStatus = status.toLowerCase();
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, updateData);

      res.json({
        message: "User updated successfully",
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ================== PHASE 2: ENHANCED AVAILABILITY SYSTEM ROUTES ==================

  // Availability patterns routes
  app.get("/api/availability-patterns", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const patterns = await storage.getAvailabilityPatternsByUser(userId);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability patterns", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/availability-patterns/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const pattern = await storage.getAvailabilityPattern(req.params.id);
      if (!pattern) {
        return res.status(404).json({ message: "Availability pattern not found" });
      }
      
      if (pattern.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      res.json(pattern);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability pattern", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/availability-patterns", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const patternData = insertAvailabilityPatternSchema.parse({
        ...req.body,
        userId
      });
      
      const pattern = await storage.createAvailabilityPattern(patternData);
      res.json({ message: "Availability pattern created successfully", pattern });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid availability pattern data", error: error.message });
      } else {
        console.error("Create availability pattern error:", error);
        res.status(500).json({ message: "Failed to create availability pattern" });
      }
    }
  });

  app.put("/api/availability-patterns/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingPattern = await storage.getAvailabilityPattern(req.params.id);
      if (!existingPattern) {
        return res.status(404).json({ message: "Availability pattern not found" });
      }
      if (existingPattern.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Parse request body and strip userId to prevent ownership changes
      const rawUpdates = req.body;
      delete rawUpdates.userId;
      
      // Validate the updates (only validate required fields if they exist)
      const updates = insertAvailabilityPatternSchema.parse({
        ...existingPattern,
        ...rawUpdates
      });
      const updatedPattern = await storage.updateAvailabilityPattern(req.params.id, updates);
      
      if (!updatedPattern) {
        return res.status(404).json({ message: "Availability pattern not found" });
      }
      
      res.json({ message: "Availability pattern updated successfully", pattern: updatedPattern });
    } catch (error) {
      res.status(400).json({ message: "Invalid availability pattern data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/availability-patterns/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingPattern = await storage.getAvailabilityPattern(req.params.id);
      if (!existingPattern) {
        return res.status(404).json({ message: "Availability pattern not found" });
      }
      if (existingPattern.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const deleted = await storage.deleteAvailabilityPattern(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Availability pattern not found" });
      }
      
      res.json({ message: "Availability pattern deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability pattern", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Appointment type availability mapping routes
  app.get("/api/appointment-types/:appointmentTypeId/availability", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of appointment type
      const appointmentType = await storage.getAppointmentType(req.params.appointmentTypeId);
      if (!appointmentType || appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const mappings = await storage.getAppointmentTypeAvailabilities(req.params.appointmentTypeId);
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment type availability", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/appointment-types/:appointmentTypeId/availability", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of appointment type
      const appointmentType = await storage.getAppointmentType(req.params.appointmentTypeId);
      if (!appointmentType || appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const mappingData = insertAppointmentTypeAvailabilitySchema.parse({
        ...req.body,
        appointmentTypeId: req.params.appointmentTypeId
      });
      
      // Verify referenced availability pattern belongs to same user
      const pattern = await storage.getAvailabilityPattern(mappingData.availabilityPatternId);
      if (!pattern || pattern.userId !== userId) {
        return res.status(403).json({ message: "Availability pattern not found or access denied" });
      }
      
      const mapping = await storage.createAppointmentTypeAvailability(mappingData);
      res.json({ message: "Appointment type availability mapping created successfully", mapping });
    } catch (error) {
      res.status(400).json({ message: "Invalid mapping data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/appointment-types/:appointmentTypeId/availability/:patternId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of appointment type
      const appointmentType = await storage.getAppointmentType(req.params.appointmentTypeId);
      if (!appointmentType || appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const updates = insertAppointmentTypeAvailabilitySchema.partial().parse(req.body);
      
      // If updating availability pattern reference, verify new pattern belongs to same user
      if (updates.availabilityPatternId) {
        const pattern = await storage.getAvailabilityPattern(updates.availabilityPatternId);
        if (!pattern || pattern.userId !== userId) {
          return res.status(403).json({ message: "Availability pattern not found or access denied" });
        }
      }
      
      const updatedMapping = await storage.updateAppointmentTypeAvailability(
        req.params.appointmentTypeId, 
        req.params.patternId, 
        updates
      );
      
      if (!updatedMapping) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      
      res.json({ message: "Appointment type availability mapping updated successfully", mapping: updatedMapping });
    } catch (error) {
      res.status(400).json({ message: "Invalid mapping data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/appointment-types/:appointmentTypeId/availability/:patternId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership of appointment type
      const appointmentType = await storage.getAppointmentType(req.params.appointmentTypeId);
      if (!appointmentType || appointmentType.userId !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const deleted = await storage.deleteAppointmentTypeAvailability(
        req.params.appointmentTypeId, 
        req.params.patternId
      );
      
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      
      res.json({ message: "Appointment type availability mapping deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mapping", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Availability exceptions routes
  app.get("/api/availability-exceptions", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { date } = req.query;
      
      let exceptions;
      if (date) {
        exceptions = await storage.getAvailabilityExceptionsByDate(userId, new Date(date as string));
      } else {
        exceptions = await storage.getAvailabilityExceptionsByUser(userId);
      }
      
      res.json(exceptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability exceptions", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/availability-exceptions", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const exceptionData = insertAvailabilityExceptionSchema.parse({
        ...req.body,
        userId
      });
      
      // If exception is scoped to appointment type, verify ownership
      if (exceptionData.appointmentTypeId) {
        const appointmentType = await storage.getAppointmentType(exceptionData.appointmentTypeId);
        if (!appointmentType || appointmentType.userId !== userId) {
          return res.status(403).json({ message: "Appointment type not found or access denied" });
        }
      }
      
      const exception = await storage.createAvailabilityException(exceptionData);
      res.json({ message: "Availability exception created successfully", exception });
    } catch (error) {
      res.status(400).json({ message: "Invalid availability exception data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/availability-exceptions/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingException = await storage.getAvailabilityExceptionsByUser(userId);
      const exception = existingException.find(e => e._id === req.params.id);
      
      if (!exception) {
        return res.status(404).json({ message: "Availability exception not found" });
      }

      const updates = insertAvailabilityExceptionSchema.partial().parse(req.body);
      // Strip userId to prevent ownership changes
      delete (updates as any).userId;
      
      // If updating appointment type reference, verify ownership
      if (updates.appointmentTypeId) {
        const appointmentType = await storage.getAppointmentType(updates.appointmentTypeId);
        if (!appointmentType || appointmentType.userId !== userId) {
          return res.status(403).json({ message: "Appointment type not found or access denied" });
        }
      }
      
      const updatedException = await storage.updateAvailabilityException(req.params.id, updates);
      
      if (!updatedException) {
        return res.status(404).json({ message: "Availability exception not found" });
      }
      
      res.json({ message: "Availability exception updated successfully", exception: updatedException });
    } catch (error) {
      res.status(400).json({ message: "Invalid availability exception data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/availability-exceptions/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingExceptions = await storage.getAvailabilityExceptionsByUser(userId);
      const exception = existingExceptions.find(e => e._id === req.params.id);
      
      if (!exception) {
        return res.status(404).json({ message: "Availability exception not found" });
      }

      const deleted = await storage.deleteAvailabilityException(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Availability exception not found" });
      }
      
      res.json({ message: "Availability exception deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability exception", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ================== END PHASE 2 ROUTES ==================

  // Public pricing endpoint (no auth required)
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      // Only return active plans with public-safe data
      const publicPlans = plans
        .filter(plan => plan.isActive)
        .map(plan => {
          const planFeatures = plan.features as any || {};
          return {
            id: plan._id,
            name: plan.name,
            description: plan.description,
            price: plan.priceMonthly || 0, // in cents
            priceYearly: plan.priceYearly || 0, // in cents
            features: {
              customBranding: planFeatures.customBranding || false,
              logoUpload: planFeatures.logoUpload || false,
              bookingLimit: planFeatures.bookingLimit || 10,
              appointmentTypeLimit: planFeatures.appointmentTypeLimit || 3,
              teamMemberLimit: planFeatures.teamMemberLimit || 1,
            },
            isActive: plan.isActive
          };
        });
      res.json(publicPlans);
    } catch (error) {
      console.error('Get public plans error:', error);
      res.status(500).json({ message: "Failed to retrieve plans" });
    }
  });

  // Sync plans to Stripe (create products and prices)
  app.post("/api/dev/sync-stripe-plans", async (req, res) => {
    try {
      // Security check
      if (req.headers["x-admin-bootstrap"] !== process.env.SESSION_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const plans = await storage.getAllSubscriptionPlans();
      const { ensureStripePrices } = await import('./lib/stripe');
      
      const results = [];
      
      for (const plan of plans) {
        if (!plan.isActive) continue;
        
        try {
          console.log(`Syncing plan "${plan.name}" to Stripe...`);
          const prices = await ensureStripePrices({
            id: plan._id,
            name: plan.name,
            priceMonthly: plan.priceMonthly,
            priceYearly: plan.priceYearly,
            stripePriceMonthly: plan.stripePriceMonthly,
            stripePriceYearly: plan.stripePriceYearly
          });
          
          // Update plan with new Stripe price IDs
          const updates: any = {};
          if (prices.monthly) {
            updates.stripePriceMonthly = prices.monthly;
          }
          if (prices.yearly) {
            updates.stripePriceYearly = prices.yearly;
          }
          
          if (Object.keys(updates).length > 0) {
            await storage.updateSubscriptionPlan(plan._id, updates);
          }
          
          results.push({
            planId: plan._id,
            planName: plan.name,
            success: true,
            monthlyPriceId: prices.monthly || plan.stripePriceMonthly,
            yearlyPriceId: prices.yearly || plan.stripePriceYearly
          });
          
        } catch (error) {
          console.error(`Failed to sync plan ${plan._id}:`, error);
          results.push({
            planId: plan._id,
            planName: plan.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({ message: "Stripe sync completed", results });
    } catch (error) {
      console.error('Stripe sync error:', error);
      res.status(500).json({ message: "Sync failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Temporary admin promotion route for initial setup (remove after use)
  app.post("/api/dev/promote-admin", async (req, res) => {
    try {
      // Security checks to prevent abuse
      if (req.headers["x-admin-bootstrap"] !== process.env.SESSION_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Update user to admin status
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(user._id, { isAdmin: true });
      res.json({ message: "User promoted to admin successfully" });
    } catch (error) {
      console.error('Admin promotion error:', error);
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  // Feedback routes
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      
      // Validate that name and email are provided
      if (!feedbackData.name || !feedbackData.email) {
        return res.status(400).json({ 
          message: "Name and email are required" 
        });
      }
      
      // Store feedback in database
      const feedback = await storage.createFeedback(feedbackData);
      
      // Send email notification
      try {
        await sendFeedbackEmail({
          name: feedbackData.name,
          email: feedbackData.email,
          message: feedbackData.message,
        });
        console.log(`✅ Feedback email sent from ${feedbackData.email}`);
      } catch (emailError) {
        console.error('Failed to send feedback email:', emailError);
        // Don't fail the request if email fails, feedback is still saved
      }
      
      res.json({ message: "Feedback submitted successfully" });
    } catch (error) {
      console.error('Create feedback error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid feedback data", 
          errors: error.issues 
        });
      }
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", requireAdmin, async (req, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notifications = await storage.getNotificationsByUser(session.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Failed to retrieve notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notifications = await storage.getUnreadNotificationsByUser(session.userId);
      const count = notifications.length;
      res.json({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.markAllNotificationsAsRead(session.userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Cron endpoint to send 24-hour reminders (called by Convex cron)
  app.post("/api/cron/send-reminder", async (req, res) => {
    try {
      const { bookingId } = req.body;

      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
      }

      // Get booking details
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get user (business owner) details
      const user = await storage.getUserById(booking.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get appointment type if exists
      let appointmentTypeName = "Appointment";
      let appointmentDuration = booking.duration || 30;
      if (booking.appointmentTypeId) {
        const appointmentType = await storage.getAppointmentTypeById(booking.appointmentTypeId);
        if (appointmentType) {
          appointmentTypeName = appointmentType.name;
          appointmentDuration = appointmentType.duration;
        }
      }

      // Get branding info
      const branding = await storage.getBrandingByUserId(booking.userId);

      // Determine timezones for email formatting
      const customerTimezone = booking.customerTimezone || user.timezone || 'Etc/UTC';
      const businessTimezone = user.timezone || 'Etc/UTC';

      // Format dates for customer email (in customer's timezone)
      const customerEmailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        businessName: user.businessName || user.name,
        businessEmail: user.email,
        appointmentDate: formatDateForEmail(new Date(booking.appointmentDate), customerTimezone),
        appointmentTime: formatTimeForEmail(new Date(booking.appointmentDate), customerTimezone),
        appointmentType: appointmentTypeName,
        appointmentDuration,
        bookingToken: booking.bookingToken,
        eventUrl: booking.eventUrl,
        businessColors: branding ? { primary: branding.primary, secondary: branding.secondary } : undefined,
        businessLogo: branding?.logoUrl,
        usePlatformBranding: branding?.usePlatformBranding ?? true,
      };

      // Format dates for business email (in business user's timezone)
      const businessEmailData = {
        ...customerEmailData,
        customerEmail: user.email, // Send to business owner
        appointmentDate: formatDateForEmail(new Date(booking.appointmentDate), businessTimezone),
        appointmentTime: formatTimeForEmail(new Date(booking.appointmentDate), businessTimezone),
      };

      // Send reminder emails
      const customerEmailSent = await sendAppointmentReminder(customerEmailData);
      const businessEmailSent = await sendAppointmentReminder({
        ...businessEmailData,
        customerName: `Business Reminder: ${booking.customerName}`,
      });

      // Mark reminders as sent
      if (customerEmailSent && businessEmailSent) {
        await storage.markRemindersSent(bookingId, "both");
      } else if (customerEmailSent) {
        await storage.markRemindersSent(bookingId, "customer");
      } else if (businessEmailSent) {
        await storage.markRemindersSent(bookingId, "business");
      }

      res.json({
        message: "Reminders sent successfully",
        customerEmailSent,
        businessEmailSent
      });
    } catch (error) {
      console.error('[Cron] Send reminder error:', error);
      res.status(500).json({ message: "Failed to send reminder emails" });
    }
  });

  // Initialize default subscription plans if they don't exist
  const initializeDefaultPlans = async () => {
    try {
      console.log('Checking for default subscription plans...');
      const existingPlans = await storage.getAllSubscriptionPlans();

      // Check if "free" plan exists
      const freePlanExists = existingPlans.some((p: any) => p.planId === 'free');
      if (!freePlanExists) {
        console.log('Creating default "free" plan...');
        const freePlan = {
          planId: 'free',
          name: 'Free Plan',
          description: 'Perfect for getting started. Manage your first bookings with all the essential tools at no cost.',
          features: applyDefaults({}),
          isActive: true,
        };
        await storage.createSubscriptionPlan(freePlan);
        console.log('✅ Free plan created');
      }

      // Check if "pro" plan exists
      const proPlanExists = existingPlans.some((p: any) => p.planId === 'pro');
      if (!proPlanExists) {
        console.log('Creating default "pro" plan...');
        const proPlan = {
          planId: 'pro',
          name: 'Pro Plan',
          description: 'Unlock unlimited bookings, custom branding, payment processing, and automated reminders to scale your business.',
          priceMonthly: 1000, // $10.00 in cents
          priceYearly: 9600,  // $96.00 in cents
          features: applyDefaults({}),
          isActive: true,
        };

        // Create plan first
        const created = await storage.createSubscriptionPlan(proPlan);

        // Ensure Stripe prices exist
        if (created) {
          const prices = await ensureStripePrices({
            id: created._id,
            name: created.name,
            priceMonthly: created.priceMonthly,
            priceYearly: created.priceYearly,
            stripePriceMonthly: created.stripePriceMonthly,
            stripePriceYearly: created.stripePriceYearly,
          });

          if (prices.monthly || prices.yearly) {
            await storage.updateSubscriptionPlan(created._id, {
              stripePriceMonthly: prices.monthly ?? created.stripePriceMonthly,
              stripePriceYearly: prices.yearly ?? created.stripePriceYearly,
            });
          }
        }
        console.log('✅ Pro plan created with Stripe prices');
      }

      console.log('✅ Default subscription plans initialized');
    } catch (error) {
      console.error('Error initializing default plans:', error);
      // Don't throw - let the server start even if plan initialization fails
    }
  };

  // Initialize plans on startup
  await initializeDefaultPlans();

  const httpServer = createServer(app);
  return httpServer;
}
