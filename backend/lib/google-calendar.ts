import { google } from 'googleapis';
import { convex } from '../convex-client';
import { api } from '../../convex/_generated/api';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Function to get dynamic redirect URI based on current environment
function getRedirectUri(req?: any): string {
  // For development, always use localhost:3000 to match Google Cloud Console
  const redirectUri = 'http://localhost:3000/api/google-calendar/callback';
  console.log(`Google Calendar Redirect URI: ${redirectUri}`);
  return redirectUri;
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
    console.log('Google Calendar getAuthUrl - GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
    console.log('Google Calendar getAuthUrl - GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    
    // Create a new OAuth2 client with the correct redirect URI
    const redirectUri = getRedirectUri(req);
    console.log('Google Calendar getAuthUrl - redirectUri:', redirectUri);
    
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: userId, // Pass userId in state to identify user on callback
        prompt: 'consent' // Force consent to ensure refresh token
      });
      console.log('Google Calendar getAuthUrl - Generated authUrl:', authUrl);
      return authUrl;
    } catch (error) {
      console.error('Google Calendar getAuthUrl error:', error);
      throw error;
    }
  }

  async handleCallback(code: string, userId: string, req?: any) {
    try {
      const redirectUri = getRedirectUri(req);
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get access and refresh tokens');
      }

      // Calculate token expiry (Google tokens typically expire in 1 hour)
      const tokenExpiry = Date.now() + ((tokens.expiry_date || 3600000) - Date.now());

      // Store credentials in Convex
      await convex.mutation(api.googleCalendarCredentials.upsert, {
        userId: userId as any, // Cast to Convex ID type
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry,
        scope: tokens.scope || 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
      });

      return { success: true };
    } catch (error) {
      console.error('Google Calendar callback error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async refreshAccessToken(userId: string): Promise<string | null> {
    try {
      const credentials = await convex.query(api.googleCalendarCredentials.getByUserId, { userId: userId as any });

      if (!credentials) {
        console.log(`No Google credentials found for user ${userId}`);
        return null;
      }

      // Set the refresh token
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken
      });

      // Refresh the token
      const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();

      if (!newCredentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update stored credentials
      const tokenExpiry = Date.now() + ((newCredentials.expiry_date || 3600000) - Date.now());
      await convex.mutation(api.googleCalendarCredentials.update, {
        id: credentials._id,
        updates: {
          accessToken: newCredentials.access_token,
          tokenExpiry,
        }
      });

      return newCredentials.access_token;
    } catch (error) {
      console.error('Error refreshing Google access token:', error);
      return null;
    }
  }

  // Helper method to execute calendar operations with automatic token refresh retry
  private async executeWithTokenRefresh<T>(
    userId: string,
    operation: (calendar: any) => Promise<T>
  ): Promise<T> {
    const credentials = await convex.query(api.googleCalendarCredentials.getByUserId, { userId: userId as any });

    if (!credentials) {
      throw new Error('Google Calendar not connected for this user');
    }

    // Check if token is expired
    const now = Date.now();
    if (credentials.tokenExpiry < now) {
      console.log('Access token expired, refreshing...');
      const newAccessToken = await this.refreshAccessToken(userId);
      if (!newAccessToken) {
        throw new Error('Failed to refresh access token');
      }
      credentials.accessToken = newAccessToken;
    }

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      return await operation(calendar);
    } catch (error: any) {
      // If token expired during request, refresh and retry once
      if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
        console.log('Token expired during operation, refreshing and retrying...');
        const newAccessToken = await this.refreshAccessToken(userId);
        if (!newAccessToken) {
          throw new Error('Failed to refresh access token on retry');
        }

        this.oauth2Client.setCredentials({
          access_token: newAccessToken,
          refresh_token: credentials.refreshToken,
        });

        const newCalendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        return await operation(newCalendar);
      }
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
      console.log('=== Google Calendar Event Creation Start ===');
      console.log('Creating Google Calendar event for user:', userId);
      console.log('userId type:', typeof userId);
      console.log('userId value:', JSON.stringify(userId));
      console.log('Event data:', JSON.stringify(eventData, null, 2));
      
      // Check if user has Google Calendar credentials
      console.log('Google Calendar - Looking for credentials for userId:', userId);
      
      let credentials;
      try {
        credentials = await convex.query(api.googleCalendarCredentials.getByUserId, { userId: userId as any });
        console.log('Google Calendar credentials query result:', credentials ? 'Found' : 'Not found');
        if (credentials) {
          console.log('Credentials details:', {
            hasAccessToken: !!credentials.accessToken,
            hasRefreshToken: !!credentials.refreshToken,
            tokenExpiry: credentials.tokenExpiry,
            isConnected: credentials.isConnected,
            isExpired: credentials.tokenExpiry < Date.now()
          });
        }
      } catch (credError) {
        console.error('Error fetching Google Calendar credentials:', credError);
        console.error('Credentials error details:', credError instanceof Error ? credError.message : 'Unknown');
        throw new Error(`Failed to fetch calendar credentials: ${credError instanceof Error ? credError.message : 'Unknown error'}`);
      }
      
      if (!credentials) {
        console.log('No credentials found - Google Calendar not connected for this user');
        throw new Error('Google Calendar not connected for this user');
      }
      
      const event = await this.executeWithTokenRefresh(userId, async (calendar) => {
        const requestBody = {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.start.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: eventData.end.toISOString(),
            timeZone: 'UTC',
          },
          attendees: eventData.attendees?.map(email => ({ email })),
        };
        
        console.log('Google Calendar API request body:', JSON.stringify(requestBody, null, 2));
        
        const result = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: requestBody,
        });
        
        console.log('Google Calendar API response:', result.data);
        return result;
      });

      console.log('=== Google Calendar Event Creation Success ===');
      return {
        success: true,
        eventId: event.data.id,
        eventLink: event.data.htmlLink,
      };
    } catch (error) {
      console.error('=== Google Calendar Event Creation Error ===');
      console.error('Error creating calendar event:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCalendarEvents(userId: string, timeMin?: Date, timeMax?: Date) {
    try {
      const events = await this.executeWithTokenRefresh(userId, async (calendar) => {
        return await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin?.toISOString(),
          timeMax: timeMax?.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        });
      });

      return {
        success: true,
        events: events.data.items || [],
      };
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        events: [],
      };
    }
  }

  async updateCalendarEvent(userId: string, eventId: string, eventData: {
    summary?: string;
    description?: string;
    start?: Date;
    end?: Date;
    attendees?: string[];
  }) {
    try {
      console.log('=== Google Calendar Event Update Start ===');
      console.log('Updating Google Calendar event for user:', userId);
      console.log('Event ID:', eventId);
      console.log('Update data:', JSON.stringify(eventData, null, 2));
      
      const event = await this.executeWithTokenRefresh(userId, async (calendar) => {
        const requestBody = {
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start ? {
            dateTime: eventData.start.toISOString(),
            timeZone: 'UTC',
          } : undefined,
          end: eventData.end ? {
            dateTime: eventData.end.toISOString(),
            timeZone: 'UTC',
          } : undefined,
          attendees: eventData.attendees?.map(email => ({ email })),
        };
        
        console.log('Google Calendar API update request body:', JSON.stringify(requestBody, null, 2));
        
        const result = await calendar.events.update({
          calendarId: 'primary',
          eventId: eventId,
          requestBody: requestBody,
        });
        
        console.log('Google Calendar API update response:', result.data);
        return result;
      });

      console.log('=== Google Calendar Event Update Success ===');
      return {
        success: true,
        eventId: event.data.id,
        eventLink: event.data.htmlLink,
      };
    } catch (error) {
      console.error('=== Google Calendar Event Update Error ===');
      console.error('Error updating calendar event:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteCalendarEvent(userId: string, eventId: string) {
    try {
      await this.executeWithTokenRefresh(userId, async (calendar) => {
        return await calendar.events.delete({
          calendarId: 'primary',
          eventId: eventId,
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async disconnect(userId: string) {
    try {
      await convex.mutation(api.googleCalendarCredentials.deleteByUserId, { userId: userId as any });
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getConnectionStatus(userId: string) {
    try {
      console.log('Getting connection status for user:', userId);
      const credentials = await convex.query(api.googleCalendarCredentials.getByUserId, { userId: userId as any });
      console.log('Retrieved credentials:', credentials);

      if (!credentials) {
        console.log('No credentials found for user:', userId);
        return {
          isConnected: false,
          connectedAccount: null,
          isSynced: false,
        };
      }

      console.log('Credentials found, returning status:', {
        isConnected: credentials.isConnected,
        connectedAccount: credentials.scope || 'Unknown',
        isSynced: credentials.isSynced,
      });

      return {
        isConnected: credentials.isConnected,
        connectedAccount: credentials.scope || 'Unknown',
        isSynced: credentials.isSynced,
      };
    } catch (error) {
      console.error('Error getting connection status:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown', error instanceof Error ? error.stack : 'No stack');
      return {
        isConnected: false,
        connectedAccount: null,
        isSynced: false,
      };
    }
  }

  async syncAllBookings(userId: string) {
    try {
      // Get all bookings for this user
      const bookings = await convex.query(api.bookings.getByUser, { userId: userId as any });

      if (!bookings || bookings.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      let syncedCount = 0;
      const errors: string[] = [];

      for (const booking of bookings) {
        try {
          const eventData = {
            summary: `Booking: ${booking.customerName}`,
            description: `Booking with ${booking.customerName}\nEmail: ${booking.customerEmail}`,
            start: new Date(booking.appointmentDate),
            end: new Date(booking.appointmentDate + (booking.duration || 30) * 60 * 1000),
            attendees: [booking.customerEmail],
          };

          const result = await this.createCalendarEvent(userId, eventData);

          if (result.success) {
            syncedCount++;
          } else {
            errors.push(`Failed to sync booking ${booking._id}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`Error syncing booking ${booking._id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }

      return {
        success: errors.length === 0,
        syncedCount,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      console.error('Error syncing all bookings:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
