import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from 'google-auth-library';
import Stripe from "stripe";
import multer from "multer";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage, createDemoData } from "./storage";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { insertUserSchema, insertBookingSchema, insertAvailabilitySchema, insertBlockedDateSchema, insertAppointmentTypeSchema, insertAvailabilityPatternSchema, insertAppointmentTypeAvailabilitySchema, insertAvailabilityExceptionSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertBrandingSchema, insertFeedbackSchema, availabilitySettingsSchema, loginSchema, signupSchema, resendVerificationSchema, changePasswordSchema, changeEmailSchema, disconnectGoogleSchema, forgotPasswordSchema, resetPasswordSchema, checkoutStartSchema, validateCouponSchema } from "./schemas";
import { applyDefaults, FeaturesShape } from "./lib/features";
import { ensureStripePrices } from "./lib/stripe";
import { requireFeature, getUserFeatures } from "./lib/plan-features";
import { RESERVED_SLUGS } from "./constants";
import { toSlug, ensureUniqueSlug, generateBusinessIdentifiers } from "./lib/slug";
import { googleCalendarService } from "./lib/google-calendar";
import { z } from "zod";
import { sendCustomerConfirmation, sendBusinessNotification, sendRescheduleConfirmation, sendRescheduleBusinessNotification, sendCancellationConfirmation, sendCancellationBusinessNotification } from "./email";
import { FeatureGate } from "./featureGating";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize demo data on startup
  await createDemoData();
  
  // Initialize Google OAuth client
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // Initialize Stripe client
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

    // Only request basic profile info for login/signup (no calendar access)
    const scope = 'openid email profile';
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15);

    // Store state in session for verification
    (req.session as any).oauthState = state;
    
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
          // Only include optional fields when they have non-null values
          // (Convex validators reject explicit null)
          // stripeCustomerId / stripeSubscriptionId / renewsAt / cancelAt intentionally omitted when null
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

      // For popup window, close the popup and redirect parent
      res.send(`
        <script>
          if (window.opener) {
            // Notify parent window and close popup
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: ${JSON.stringify(userData)}
            }, '*');
            window.close();
          } else {
            // Fallback: redirect to frontend
            window.location.href = '${frontendUrl}/booking';
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
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'CALENDAR_ERROR',
                error: 'Invalid callback parameters'
              }, '*');
              window.close();
            } else {
              window.location.href = '${frontendUrl}/booking?calendar_error=invalid_callback';
            }
          </script>
        `);
      }

      const result = await googleCalendarService.handleCallback(code, userId, req);

      if (result.success) {
        // Send success message to parent window and attempt to close
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Calendar Connected</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  text-align: center;
                  max-width: 400px;
                }
                .success-icon {
                  width: 64px;
                  height: 64px;
                  background: #10b981;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 20px;
                }
                .checkmark {
                  color: white;
                  font-size: 32px;
                  font-weight: bold;
                }
                h1 {
                  color: #1f2937;
                  margin: 0 0 10px;
                  font-size: 24px;
                }
                p {
                  color: #6b7280;
                  margin: 0;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success-icon">
                  <span class="checkmark">✓</span>
                </div>
                <h1>Calendar Connected!</h1>
                <p>This window will close automatically...</p>
              </div>
              <script>
                // Send message immediately and also on load
                function sendMessage() {
                  if (window.opener) {
                    console.log('Sending CALENDAR_CONNECTED message to parent');
                    window.opener.postMessage({ type: 'CALENDAR_CONNECTED' }, '*');
                  } else {
                    console.log('No window.opener found');
                  }
                }
                
                // Send immediately
                sendMessage();
                
                // Also send on load as backup
                window.addEventListener('load', sendMessage);
                
                // Try to close window after a short delay
                setTimeout(() => {
                  window.close();
                  // If close fails, show manual close message
                  setTimeout(() => {
                    const p = document.querySelector('p');
                    if (p) p.textContent = 'Please close this window';
                  }, 300);
                }, 1000);
              </script>
            </body>
          </html>
        `);
      } else {
        // Show error and attempt to close
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connection Failed</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%);
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  text-align: center;
                  max-width: 400px;
                }
                h1 {
                  color: #1f2937;
                  margin: 0 0 10px;
                  font-size: 24px;
                }
                p {
                  color: #6b7280;
                  margin: 0;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Connection Failed</h1>
                <p>Please close this window and try again</p>
              </div>
              <script>
                // Send error message immediately and also on load
                function sendErrorMessage() {
                  if (window.opener) {
                    console.log('Sending CALENDAR_ERROR message to parent');
                    window.opener.postMessage({ type: 'CALENDAR_ERROR', error: '${result.error}' }, '*');
                  } else {
                    console.log('No window.opener found for error');
                  }
                }
                
                // Send immediately
                sendErrorMessage();
                
                // Also send on load as backup
                window.addEventListener('load', sendErrorMessage);
                
                setTimeout(() => window.close(), 2000);
              </script>
            </body>
          </html>
        `);
      }
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      console.error('Google Calendar callback error:', error);
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'CALENDAR_ERROR',
              error: 'Calendar connection failed'
            }, '*');
            window.close();
          } else {
            window.location.href = '${frontendUrl}/booking?calendar_error=connection_failed';
          }
        </script>
      `);
    }
  });

  app.get("/api/google-calendar/status", async (req, res) => {
    try {
      console.log('Google Calendar status request - Session:', req.session);
      console.log('Google Calendar status request - User:', (req.session as any)?.user);
      console.log('Google Calendar status request - UserId from session:', (req.session as any)?.userId);
      
      if (!(req.session as any)?.user) {
        console.log('No user session found in calendar status check');
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.session as any)?.user?.id || (req.session as any)?.userId;
      console.log('Google Calendar status - Resolved userId:', userId, 'type:', typeof userId);

      const status = await googleCalendarService.getConnectionStatus(userId);
      console.log('Google Calendar status result:', status);
      res.json(status);
    } catch (error) {
      console.error('Google Calendar status error:', error);
      res.status(500).json({ message: "Failed to get calendar status" });
    }
  });

  app.post("/api/google-calendar/disconnect", async (req, res) => {
    try {
      if (!(req.session as any)?.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.session as any)?.user?.id || (req.session as any)?.userId;
      await googleCalendarService.disconnect(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Google Calendar disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  app.post("/api/google-calendar/sync", async (req, res) => {
    try {
      if (!(req.session as any)?.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const result = await googleCalendarService.syncAllBookings((req.session as any).user.id);
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

  // Admin login endpoint - simplified, no email verification required
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is actually an admin
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Verify password exists
      if (!user.password) {
        return res.status(400).json({ message: "Invalid admin account configuration" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session data
      (req.session as any).userId = user._id;
      (req.session as any).isAdmin = true;
      (req.session as any).user = {
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: true
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

  // Admin stats endpoint
  app.get("/api/admin/stats", async (req, res) => {
    try {
      // Verify admin session
      const userId = (req.session as any)?.userId;
      const isAdmin = (req.session as any)?.isAdmin;

      if (!userId || !isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Get stats
      const users = await storage.getAllUsers();
      const bookings = await storage.getAllBookings();

      // Count active subscriptions (users with active status)
      const activeSubscriptions = users.filter((u: any) =>
        u.subscription && u.subscription.status === 'active'
      ).length;

      res.json({
        totalUsers: users.length,
        totalBookings: bookings.length,
        activeSubscriptions: activeSubscriptions || 0
      });

    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: "Failed to load admin stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Email signup endpoint with verification
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      const { email, name, password } = validatedData;

      // Check if user already exists
      let existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
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
        timezone: 'UTC',
        country: 'US',
        isAdmin: false,
        primaryColor: '#ef4444',
        secondaryColor: '#f97316',
        accentColor: '#3b82f6',
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

      // Redirect to frontend booking page with verified flag
      res.redirect(`${frontendUrl}/booking?verified=true`);
      
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
      console.log('=== Auth /api/auth/me Debug ===');
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('Cookies received:', req.headers.cookie);
      console.log('Session ID:', req.sessionID);
      console.log('Session object:', JSON.stringify(req.session, null, 2));
      console.log('UserId from session:', (req.session as any).userId);
      console.log('User from session:', (req.session as any).user);
      console.log('================================');
      
      if (!(req.session as any).userId) {
        console.log('No userId in session - returning 401');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        console.log('User not found in storage for userId:', (req.session as any).userId);
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log('Auth me - Found user:', { id: user._id, email: user.email, name: user.name });
      console.log('Auth me - User ID type:', typeof user._id);
      console.log('Auth me - User ID value:', user._id);
      
      // Return comprehensive user data for account page
      res.json({ 
        user: { 
          id: user._id, 
          email: user.email, 
          name: user.name, 
          picture: user.picture, 
          isAdmin: user.isAdmin,
          businessName: user.businessName,
          timezone: user.timezone,
          country: user.country,
          primaryColor: user.primaryColor,
          secondaryColor: user.secondaryColor,
          accentColor: user.accentColor,
          slug: user.slug,
          googleId: user.googleId,
          emailVerified: user.emailVerified
        } 
      });
    } catch (error) {
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

  // Booking routes (with feature enforcement)
  // Internal booking endpoint - simplified for booking page use (authenticated users only)
  app.post("/api/bookings", async (req, res) => {
    try {
      const { customerName, customerEmail, appointmentDate } = req.body;
      
      // Get userId from session
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
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

      // Create booking with minimal fields - no appointmentTypeId required
      const bookingData: any = {
        userId,
        customerName,
        customerEmail,
        appointmentDate: appointmentTimestamp,
        duration: 30, // Default duration
        status: "confirmed",
        bookingToken,
      };

      // Only add appointmentTypeId if it exists (optional field)
      // This ensures we don't pass undefined to Convex
      
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
      const appointmentDateObj = new Date(appointmentTimestamp);
      const appointmentEnd = new Date(appointmentDateObj.getTime() + 30 * 60 * 1000); // 30 min default
      
      googleCalendarService.createCalendarEvent(userId, {
        summary: `Appointment - ${customerName}`,
        description: `Appointment with ${customerName} (${customerEmail})`,
        start: appointmentDateObj,
        end: appointmentEnd,
        attendees: [customerEmail]
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
      const existingUserBookings = await storage.getBookingsByUser(userId);
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const sameDay = existingUserBookings.filter(booking => {
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
            primary: '#ef4444',
            secondary: '#f97316',
            accent: '#3b82f6',
            logoUrl: undefined,
            usePlatformBranding: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } as any;
        }
        
        const appointmentDate = new Date(bookingData.appointmentDate);
        const bookingUrl = `${req.protocol}://${req.get('host')}/booking-confirmation/${booking.bookingToken}`;
        const emailData = {
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          businessName: businessUser.businessName || 'My Business',
          businessEmail: businessUser.email,
          appointmentDate: appointmentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          appointmentTime: appointmentDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          appointmentType: emailAppointmentType.name,
          appointmentDuration: emailAppointmentType.duration,
          businessColors: branding ? {
            primary: branding.primary,
            secondary: branding.secondary,
            accent: branding.accent
          } : undefined,
          businessLogo: branding?.logoUrl,
          usePlatformBranding: branding?.usePlatformBranding || true,
          bookingUrl: bookingUrl
        };

        // Send emails asynchronously - don't block the response
        Promise.all([
          sendCustomerConfirmation(emailData),
          sendBusinessNotification(emailData)
        ]).catch(error => {
          console.error('Failed to send booking emails:', error);
        });

        // Create Google Calendar event and store the event ID
        googleCalendarService.createCalendarEvent(businessUser._id, {
          summary: `${emailAppointmentType.name} - ${bookingData.customerName}`,
          description: `Appointment with ${bookingData.customerName} (${bookingData.customerEmail})\n\nService: ${emailAppointmentType.name}\nDuration: ${emailAppointmentType.duration} minutes`,
          start: appointmentDate,
          end: new Date(appointmentDate.getTime() + (emailAppointmentType.duration || 30) * 60 * 1000),
          attendees: [bookingData.customerEmail]
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
          primaryColor: branding?.primary || '#ef4444',
          secondaryColor: branding?.secondary || '#f97316',
          accentColor: branding?.accent || '#3b82f6',
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
      
      const bookings = await storage.getBookingsByUser(session.userId);
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

      // Update Google Calendar event if date/time changed or status changed to cancelled
      if (existingBooking.googleCalendarEventId) {
        try {
          // If cancelled, delete the Google Calendar event
          if (booking.status === 'cancelled' && existingBooking.status !== 'cancelled') {
            await googleCalendarService.deleteCalendarEvent(session.userId, existingBooking.googleCalendarEventId);
            console.log(`✅ Google Calendar event deleted: ${existingBooking.googleCalendarEventId}`);
          }
          // If date/time changed, update the Google Calendar event
          else if (existingBooking.appointmentDate !== booking.appointmentDate) {
            const appointmentDateObj = new Date(booking.appointmentDate);
            const appointmentEnd = new Date(appointmentDateObj.getTime() + (booking.duration || 30) * 60 * 1000);
            
            await googleCalendarService.updateCalendarEvent(session.userId, existingBooking.googleCalendarEventId, {
              start: appointmentDateObj,
              end: appointmentEnd,
              summary: `Appointment - ${booking.customerName}`,
              description: `Appointment with ${booking.customerName} (${booking.customerEmail})`
            });
            console.log(`✅ Google Calendar event updated: ${existingBooking.googleCalendarEventId}`);
          }
        } catch (calendarError) {
          console.error('Failed to update Google Calendar event:', calendarError);
          // Don't fail the booking update if calendar sync fails
        }
      }
      // Note: We don't create a new calendar event during edit if one doesn't exist
      // Calendar events should be created during initial booking creation only
      // This prevents duplicate entries in the calendar view
      
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
            const emailData = {
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              businessName: user.businessName || user.name,
              businessEmail: user.email,
              appointmentType: appointmentType.name,
              appointmentDuration: appointmentType.duration,
              appointmentDate: new Date(booking.appointmentDate).toLocaleDateString(),
              appointmentTime: new Date(booking.appointmentDate).toLocaleTimeString(),
              businessColors: branding ? {
                primary: branding.primary,
                secondary: branding.secondary,
                accent: branding.accent
              } : undefined,
            businessLogo: branding?.logoUrl,
            usePlatformBranding: userFeatures?.poweredBy || false,
          };
          
          // Check if booking was cancelled
          if (existingBooking.status !== 'cancelled' && booking.status === 'cancelled') {
            await sendCancellationConfirmation(emailData);
            await sendCancellationBusinessNotification(emailData);
          }
          // Check if booking was rescheduled (date/time changed)
          else if (existingBooking.appointmentDate !== booking.appointmentDate) {
            const oldEmailData = {
              ...emailData,
              oldAppointmentDate: new Date(existingBooking.appointmentDate).toLocaleDateString(),
              oldAppointmentTime: new Date(existingBooking.appointmentDate).toLocaleTimeString(),
            };
            await sendRescheduleConfirmation(oldEmailData);
            await sendRescheduleBusinessNotification(oldEmailData);
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
      
      const success = await storage.deleteBooking(req.params.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete booking" });
      }
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
      const { userId, appointmentTypeId, date, timezone = 'UTC' } = req.query;
      console.log(`GET /api/availability/slots - Parsed Params:`, { userId, appointmentTypeId, date, timezone });
      
      if (!userId || !appointmentTypeId || !date) {
        console.log(`Missing required parameters:`, { userId, appointmentTypeId, date });
        return res.status(400).json({ 
          message: "Missing required parameters: userId, appointmentTypeId, and date are required" 
        });
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
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = requestDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      console.log(`Date ${date} is day ${dayOfWeek} (${dayName})`);
      
      // Filter availability for this day of week
      const dayAvailability = availability.filter(slot => 
        slot.weekday === dayName && slot.isAvailable
      );
      console.log(`Found ${dayAvailability.length} availability slots for ${dayName}:`, dayAvailability);
      
      if (dayAvailability.length === 0) {
        console.log(`No availability for ${dayName}, returning empty slots`);
        return res.json({ slots: [] }); // No availability for this day
      }
      
      // Check for exceptions on this specific date
      const exceptions = await storage.getAvailabilityExceptionsByUser(userId as string);
      const dateStr = requestDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const dateException = exceptions.find(exception => {
        const exceptionDate = new Date(exception.date).toISOString().split('T')[0];
        return exceptionDate === dateStr;
      });
      
      // If there's an "unavailable" exception for this date, return no slots
      if (dateException && dateException.type === 'unavailable') {
        return res.json({ slots: [] });
      }
      
      // If there's an "available" exception, use that instead of regular availability
      if (dateException && dateException.type === 'available') {
        // For now, use the regular weekly hours when there's an available exception
        // In the future, this could override with custom hours from the exception
      }
      
      // Get existing bookings for this date to check for conflicts
      const allBookings = await storage.getBookingsByUser(userId as string);
      const dateBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.appointmentDate).toISOString().split('T')[0];
        return bookingDate === dateStr;
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
      
      // Sort availability by start time
      dayAvailability.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      for (const availSlot of dayAvailability) {
        const [startHour, startMin] = availSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = availSlot.endTime.split(':').map(Number);
        
        const startTimeMinutes = startHour * 60 + startMin;
        const endTimeMinutes = endHour * 60 + endMin;
        
        let currentTimeMinutes = startTimeMinutes;
        
        while (currentTimeMinutes + appointmentDuration <= endTimeMinutes) {
          const slotHour = Math.floor(currentTimeMinutes / 60);
          const slotMin = currentTimeMinutes % 60;
          
          // Create the appointment time for conflict checking
          const appointmentDateTime = new Date(requestDate);
          appointmentDateTime.setHours(slotHour, slotMin, 0, 0);
          
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
            return slotEffectiveStart < bookingEffectiveEnd && slotEffectiveEnd > bookingEffectiveStart;
          });
          
          if (!hasConflict) {
            // Format time for display
            const time = new Date();
            time.setHours(slotHour, slotMin, 0, 0);
            const timeString = time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
            slots.push(timeString);
          }
          
          currentTimeMinutes += totalSlotTime;
        }
      }
      
      console.log(`Generated ${slots.length} time slots:`, slots);
      res.json({ slots });
    } catch (error) {
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
      res.json({ 
        id: user._id,
        name: user.name,
        businessName: user.businessName, 
        logoUrl: user.logoUrl, 
        welcomeMessage: user.welcomeMessage, 
        primaryColor: user.primaryColor, 
        secondaryColor: user.secondaryColor, 
        accentColor: user.accentColor, 
        timezone: user.timezone,
        slug: user.slug
      });
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

      // Delete the user and all associated data
      await storage.deleteUser(req.params.id);

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
      const userId = "demo-user-id"; // In production, get from session
      const blockedDates = await storage.getBlockedDatesByUser(userId);
      res.json(blockedDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocked dates", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/blocked-dates", async (req, res) => {
    try {
      const blockedDateData = insertBlockedDateSchema.parse({
        ...req.body,
        userId: "demo-user-id" // In production, get from session
      });
      const blockedDate = await storage.createBlockedDate(blockedDateData);
      res.json({ message: "Blocked date created successfully", blockedDate });
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
      
      // Feature enforcement is now handled by requireFeature middleware

      const appointmentTypeData = insertAppointmentTypeSchema.parse({
        ...req.body,
        userId
      });
      
      const appointmentType = await storage.createAppointmentType(appointmentTypeData);
      res.json({ message: "Appointment type created successfully", appointmentType });
    } catch (error) {
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

      const updates = validation.data;
      const appointmentType = await storage.updateAppointmentType(req.params.id, updates);
      res.json({ message: "Appointment type updated successfully", appointmentType });
    } catch (error) {
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

  // Test route
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong" });
  });

  // Helper middleware for authentication and admin checks
  const requireAuth = (req: any, res: any, next: any) => {
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

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
      
      let branding = await storage.getBranding(userId);
      if (!branding) {
        // Create default branding if none exists (only for authenticated requests)
        if (!queryUserId) {
          branding = await storage.createBranding({ userId });
        } else {
          // For public requests, return default branding values without saving
          return res.json({
            userId,
            primaryColor: '#ef4444',
            secondaryColor: '#f97316',
            accentColor: '#3b82f6',
            logoUrl: undefined,
            usePlatformBranding: true,
            createdAt: new Date(),
            updatedAt: Date.now()
          });
        }
      }
      
      res.json(branding);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branding", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/branding", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const { primary, secondary, accent, usePlatformBranding, displayName, showDisplayName, showProfilePicture } = req.body || {};
      
      // Plan gate using feature system (disallow custom colors on Free)
      const { getUserFeatures } = await import("./lib/plan-features");
      const features = await getUserFeatures(userId);
      if (!features.customBranding) {
        return res.status(403).json({ message: "Branding customization requires Pro Plan." });
      }
      
      // Validate hex colors
      const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
      for (const color of [primary, secondary, accent]) {
        if (!HEX_REGEX.test(color)) {
          return res.status(400).json({ message: "Colors must be hex format like #FF6B4A" });
        }
      }

      // Determine platform branding based on features
      const nextUsePlatformBranding = features.customBranding ? !!usePlatformBranding : true;

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
          showProfilePicture
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

      // plan gate using hardened getUserFeatures
      const { getUserFeatures } = await import("./lib/plan-features");
      const features = await getUserFeatures(userId);
      
      if (!features.customBranding) {
        return res.status(403).json({ message: "Logo upload not available in your plan" });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file provided" });
      if (!["image/png","image/jpeg","image/gif"].includes(file.mimetype)) {
        return res.status(400).json({ message: "Only PNG/JPG/GIF allowed" });
      }

      // save under server/public/uploads
      const outDir = path.join(import.meta.dirname, "public", "uploads");
      fs.mkdirSync(outDir, { recursive: true });
      const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/gif" ? "gif" : "jpg";
      const filename = `logo-${userId}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(outDir, filename), file.buffer);
      const logoUrl = `/uploads/${filename}`;

      await storage.updateBranding(userId, { logoUrl, updatedAt: Date.now() });
      return res.json({ logoUrl });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Upload failed" });
    }
  });

  app.post("/api/branding/profile", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      // plan gate using hardened getUserFeatures
      const { getUserFeatures } = await import("./lib/plan-features");
      const features = await getUserFeatures(userId);
      
      if (!features.customBranding) {
        return res.status(403).json({ message: "Profile picture upload not available in your plan" });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file provided" });
      if (!["image/png","image/jpeg","image/gif"].includes(file.mimetype)) {
        return res.status(400).json({ message: "Only PNG/JPG/GIF allowed" });
      }

      // save under server/public/uploads
      const outDir = path.join(import.meta.dirname, "public", "uploads");
      fs.mkdirSync(outDir, { recursive: true });
      const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/gif" ? "gif" : "jpg";
      const filename = `profile-${userId}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(outDir, filename), file.buffer);
      const profilePictureUrl = `/uploads/${filename}`;

      await storage.updateBranding(userId, { profilePictureUrl, updatedAt: Date.now() });
      return res.json({ profilePictureUrl });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Upload failed" });
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
      const cancel = `${frontendUrl}/pricing?canceled=1`;

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

      // optimistic target plan (still locked by getUserFeatures until webhook marks active)
      await storage.updateUserSubscription(userId, { planId, isAnnual: interval === "year" });

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

          if (userId) {
            // Explicit upgrade to Pro plan
            await storage.updateUserSubscription(userId, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              planId: "pro",
              status: "active",
            });
            console.log(`✅ Upgraded user ${userId} to Pro`);
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

      await storage.updateUserSubscription(userSubscription.userId, {
        status: subscription.status,
        stripeSubscriptionId: subscription._id,
        renewsAt: subscription.current_period_end ? subscription.current_period_end * 1000 : undefined,
        cancelAt: subscription.cancel_at ? subscription.cancel_at * 1000 : undefined,
      });

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
      const planDistribution = allPlans.map(plan => {
        const subscriptions = allUserSubscriptions.filter(sub => 
          sub.planId === plan._id && sub.status === "active"
        ).length;
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
      
      // Format user data for admin interface
      const usersWithDetails = allUsers.map(user => {
        const userBookings = allBookings.filter(booking => booking.userId === user._id);
        const userSubscription = allUserSubscriptions.find(sub => sub.userId === user._id);
        const userPlan = userSubscription ? allPlans.find(plan => plan._id === userSubscription.planId) : null;
        
        return {
          id: user._id,
          businessName: user.businessName || user.name,
          email: user.email,
          plan: userPlan ? userPlan.name : "Free",
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
      const feedback = await storage.createFeedback(feedbackData);
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

  const httpServer = createServer(app);
  return httpServer;
}
