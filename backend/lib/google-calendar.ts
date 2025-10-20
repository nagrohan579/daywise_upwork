import { google } from 'googleapis';

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
    // TODO: Implement with Convex storage
    console.warn('Google Calendar handleCallback not yet implemented with Convex');
    return { success: false, error: 'Not implemented' };
  }

  async refreshAccessToken(userId: string): Promise<string | null> {
    // TODO: Implement with Convex storage
    console.warn('Google Calendar refreshAccessToken not yet implemented with Convex');
    return null;
  }

  // Helper method to execute calendar operations with automatic token refresh retry
  private async executeWithTokenRefresh<T>(
    userId: string,
    operation: (calendar: any) => Promise<T>
  ): Promise<T> {
    // TODO: Implement with Convex storage
    throw new Error('Google Calendar not yet implemented with Convex');
  }

  async createCalendarEvent(userId: string, eventData: {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }) {
    // TODO: Implement with Convex storage
    console.warn('Google Calendar createCalendarEvent not yet implemented with Convex');
    return { success: false, error: 'Not implemented' };
  }

  async disconnect(userId: string) {
    // TODO: Implement with Convex storage
    console.warn('Google Calendar disconnect not yet implemented with Convex');
    return { success: false, error: 'Not implemented' };
  }

  async getConnectionStatus(userId: string) {
    // TODO: Implement with Convex storage
    return {
      isConnected: false,
      connectedAccount: null,
      isSynced: false
    };
  }

  async syncAllBookings(userId: string) {
    // TODO: Implement with Convex storage
    console.warn('Google Calendar syncAllBookings not yet implemented with Convex');
    return { success: false, syncedCount: 0, error: 'Not implemented' };
  }
}

export const googleCalendarService = new GoogleCalendarService();
