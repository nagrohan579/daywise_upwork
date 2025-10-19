import { google } from 'googleapis';
import { db } from '../db';
import { googleCalendarCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Function to get dynamic redirect URI based on current environment
function getRedirectUri(req?: any): string {
  // Use environment variables first, then dynamic detection
  if (process.env.BASE_URL) {
    const redirectUri = `${process.env.BASE_URL}/api/google-calendar/callback`;
    console.log(`Google Calendar Redirect URI (BASE_URL): ${redirectUri}`);
    return redirectUri;
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    const redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/google-calendar/callback`;
    console.log(`Google Calendar Redirect URI (REPLIT): ${redirectUri}`);
    return redirectUri;
  }
  
  if (req) {
    // Fallback to dynamic detection
    const host = req.get('host');
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(',')[0] || req.protocol;
    const baseUrl = `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/google-calendar/callback`;
    console.log(`Google Calendar Redirect URI (dynamic): ${redirectUri}`);
    return redirectUri;
  }
  
  return `http://localhost:5000/api/google-calendar/callback`;
}

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    // Initialize with empty redirect URI - will be set dynamically
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      '' // Will be set dynamically in getAuthUrl
    );
  }

  getAuthUrl(userId: string, req?: any): string {
    // Create a new OAuth2 client with the correct redirect URI
    const redirectUri = getRedirectUri(req);
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId in state to identify user on callback
      prompt: 'consent' // Force consent to ensure refresh token
    });
  }

  async handleCallback(code: string, userId: string, req?: any) {
    try {
      // Create a new OAuth2 client with the correct redirect URI for token exchange
      const redirectUri = getRedirectUri(req);
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Google');
      }

      // Set credentials for the client
      oauth2Client.setCredentials(tokens);

      // Store credentials in database
      await db.insert(googleCalendarCredentials).values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token!,
        tokenExpiry: new Date(tokens.expiry_date!),
        scope: 'calendar,calendar.events',
        isConnected: true
      }).onConflictDoUpdate({
        target: googleCalendarCredentials.userId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token!,
          tokenExpiry: new Date(tokens.expiry_date!),
          isConnected: true,
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Google Calendar OAuth error:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  async refreshAccessToken(userId: string): Promise<string | null> {
    try {
      const credentials = await db.query.googleCalendarCredentials.findFirst({
        where: eq(googleCalendarCredentials.userId, userId)
      });

      if (!credentials || !credentials.refreshToken) {
        return null;
      }

      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken
      });

      const { credentials: newTokens } = await this.oauth2Client.refreshAccessToken();
      
      if (!newTokens.access_token) {
        return null;
      }

      // Update stored tokens
      await db.update(googleCalendarCredentials)
        .set({
          accessToken: newTokens.access_token,
          tokenExpiry: new Date(newTokens.expiry_date!),
          updatedAt: new Date()
        })
        .where(eq(googleCalendarCredentials.userId, userId));

      return newTokens.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  // Helper method to execute calendar operations with automatic token refresh retry
  private async executeWithTokenRefresh<T>(
    userId: string, 
    operation: (calendar: any) => Promise<T>
  ): Promise<T> {
    const credentials = await db.query.googleCalendarCredentials.findFirst({
      where: eq(googleCalendarCredentials.userId, userId)
    });

    if (!credentials || !credentials.isConnected) {
      throw new Error('Google Calendar not connected');
    }

    // Try with existing token first
    let accessToken = credentials.accessToken;
    
    // Check if token is expired and refresh proactively
    if (new Date() >= credentials.tokenExpiry) {
      console.log('Token expired, refreshing proactively');
      const refreshedToken = await this.refreshAccessToken(userId);
      if (!refreshedToken) {
        throw new Error('Failed to refresh Google Calendar token');
      }
      accessToken = refreshedToken;
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: credentials.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      // First attempt with current token
      return await operation(calendar);
    } catch (error: any) {
      // If we get an auth error, try refreshing the token and retrying once
      if (error?.code === 401 || error?.status === 401 || 
          error?.message?.includes('invalid_grant') || 
          error?.message?.includes('Token has been expired')) {
        
        console.log('Calendar API call failed with auth error, refreshing token and retrying');
        
        const refreshedToken = await this.refreshAccessToken(userId);
        if (!refreshedToken) {
          throw new Error('Failed to refresh Google Calendar token after auth error');
        }

        // Set new credentials and retry
        this.oauth2Client.setCredentials({
          access_token: refreshedToken,
          refresh_token: credentials.refreshToken
        });

        // Retry the operation with fresh token
        return await operation(calendar);
      }
      
      // Re-throw non-auth errors
      throw error;
    }
  }

  async createCalendarEvent(userId: string, eventData: {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }) {
    try {
      return await this.executeWithTokenRefresh(userId, async (calendar) => {
        const event = {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.start.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: eventData.end.toISOString(),
            timeZone: 'UTC'
          },
          attendees: eventData.attendees?.map(email => ({ email })) || []
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event
        });

        return {
          success: true,
          eventId: response.data.id,
          eventUrl: response.data.htmlLink
        };
      });
    } catch (error) {
      console.error('Calendar event creation error:', error);
      throw new Error('Failed to create calendar event: ' + (error as Error).message);
    }
  }

  async disconnect(userId: string) {
    try {
      await db.update(googleCalendarCredentials)
        .set({
          isConnected: false,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarCredentials.userId, userId));
      
      return { success: true };
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      throw new Error('Failed to disconnect Google Calendar');
    }
  }

  async getConnectionStatus(userId: string) {
    try {
      const credentials = await db.query.googleCalendarCredentials.findFirst({
        where: eq(googleCalendarCredentials.userId, userId)
      });

      if (!credentials || !credentials.isConnected) {
        return {
          isConnected: false,
          connectedAccount: null,
          isSynced: false
        };
      }

      // Test the connection by making a simple calendar API call
      try {
        await this.executeWithTokenRefresh(userId, async (calendar) => {
          // Simple call to verify the connection works
          await calendar.calendarList.list({ maxResults: 1 });
          return true;
        });

        return {
          isConnected: true,
          connectedAccount: {
            scope: credentials.scope,
            connectedAt: credentials.updatedAt
          },
          isSynced: credentials.isSynced || false
        };
      } catch (error) {
        console.error('Calendar connection test failed:', error);
        
        // Mark as disconnected if the test fails
        await db.update(googleCalendarCredentials)
          .set({
            isConnected: false,
            updatedAt: new Date()
          })
          .where(eq(googleCalendarCredentials.userId, userId));

        return {
          isConnected: false,
          connectedAccount: null,
          isSynced: false
        };
      }
    } catch (error) {
      console.error('Calendar status check error:', error);
      return {
        isConnected: false,
        connectedAccount: null,
        isSynced: false
      };
    }
  }

  async syncAllBookings(userId: string) {
    try {
      // Get all bookings for this user
      const { bookings } = await import('@shared/schema');
      const allBookings = await db.query.bookings.findMany({
        where: eq(bookings.businessUserId, userId),
        with: {
          appointmentType: true
        }
      });

      if (allBookings.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      let syncedCount = 0;
      const errors: string[] = [];

      for (const booking of allBookings) {
        try {
          const appointmentDate = new Date(booking.appointmentDate);
          const endDate = new Date(appointmentDate.getTime() + (booking.appointmentType.duration || 30) * 60 * 1000);

          await this.createCalendarEvent(userId, {
            summary: `${booking.appointmentType.name} - ${booking.customerName}`,
            description: `Appointment with ${booking.customerName} (${booking.customerEmail})\n\nService: ${booking.appointmentType.name}\nDuration: ${booking.appointmentType.duration} minutes`,
            start: appointmentDate,
            end: endDate,
            attendees: [booking.customerEmail]
          });

          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync booking ${booking.id}:`, error);
          errors.push(`Failed to sync appointment on ${booking.appointmentDate}`);
        }
      }

      // Mark as synced in database
      await db.update(googleCalendarCredentials)
        .set({
          isSynced: true,
          lastSyncAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(googleCalendarCredentials.userId, userId));

      return { 
        success: true, 
        syncedCount, 
        totalBookings: allBookings.length,
        errors 
      };
    } catch (error) {
      console.error('Bulk calendar sync error:', error);
      throw new Error('Failed to sync bookings to calendar: ' + (error as Error).message);
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();