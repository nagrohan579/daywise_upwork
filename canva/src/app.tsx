import { Button, Rows, Text, Title, Box, Link } from "@canva/app-ui-kit";
import { auth, type AccessTokenResponse } from "@canva/user";
import { useState, useMemo, useCallback } from "react";
import * as styles from "styles/components.css";

// Import logo and preview - using assets alias
// @ts-ignore - Asset import
import daywiseLogo from "assets/images/daywise-logo.png";
// @ts-ignore - Asset import
import appPreview from "assets/images/app-preview.png";

// BACKEND_HOST is a global constant injected by webpack DefinePlugin
// It contains the value of CANVA_BACKEND_HOST from .env file
// If undefined, fallback to a default (you should set CANVA_BACKEND_HOST in .env)
const BACKEND_URL = `${BACKEND_HOST || 'http://localhost:3000'}/api/canva`;

type AuthState = 'preview' | 'checking' | 'connect' | 'authenticating' | 'authenticated';

export const App = () => {
  // Initialize Canva OAuth client for Google authentication
  const oauth = useMemo(() => auth.initOauth(), []);
  
  const [authState, setAuthState] = useState<AuthState>('preview');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  // Don't auto-check auth on mount - wait for user to click "Open" from preview
  // useEffect(() => {
  //   checkAuthStatus();
  // }, []);

  const handleOpenApp = () => {
    setAuthState('checking');
    checkAuthStatus();
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const token = await auth.getCanvaUserToken();

      const res = await fetch(`${BACKEND_URL}/auth/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.authenticated) {
        setUser(data.user);
        setAuthState('authenticated');
        return true;
      } else {
        setAuthState('connect');
        return false;
      }
    } catch (err: any) {
      console.error('Auth status check error:', err);
      setAuthState('connect');
      return false;
    }
  };

  const handleConnect = useCallback(async () => {
    setAuthState('authenticating');
    setError('');

    try {
      // Request authorization from Canva's OAuth provider (Google)
      // Canva will handle the OAuth flow and call our token exchange endpoint
      const scope = new Set(["openid", "email", "profile"]);
      const queryParams = new Map<string, string>([
        ['prompt', 'select_account'], // Force Google account chooser every time
      ]);
      await oauth.requestAuthorization({ scope, queryParams });
      
      // Get Google access token from Canva and send to backend to link Canva user
      const tokenResponse: AccessTokenResponse = await oauth.getAccessToken({ scope });
      if (!tokenResponse || !tokenResponse.token) {
        throw new Error('Failed to get access token');
      }

      // Get Canva user token for backend authentication
      const canvaToken = await auth.getCanvaUserToken();

      const backendHost = BACKEND_HOST || 'http://localhost:3000';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch(`${backendHost}/api/canva/auth/google`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${canvaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleToken: tokenResponse.token, // Google access token from Canva OAuth
          timezone: timezone,
          country: 'US'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Authentication failed');
      }

      // After linking, check auth status
      await checkAuthStatus();
      
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Authentication failed');
      setAuthState('connect');
    }
  }, [oauth]);

  const handleDisconnect = useCallback(async () => {
    try {
      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';

      const res = await fetch(`${backendHost}/api/canva/auth/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to disconnect');
      }

      // Clear local state so user can reconnect
      setUser(null);
      setAuthState('connect');
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect');
    }
  }, []);

  const handleNext = () => {
    // TODO: Implement booking submission
    console.log('Booking:', {
      appointmentType: selectedAppointmentType,
      date: selectedDate,
      time: selectedTime
    });
  };

  // Helper function to open external URLs
  // Note: Canva only allows HTTPS URLs, not HTTP (including localhost)
  // This is a security restriction - localhost URLs won't work
  const openExternalUrl = async (url: string) => {
    // Check if URL is HTTPS
    if (!url.startsWith('https://')) {
      console.warn('Canva only supports HTTPS URLs for external links. URL must start with https://');
      console.warn('For local development, use a production URL or an HTTPS tunnel service like ngrok');
      return;
    }
    
    try {
      const response = await requestOpenExternalUrl({ url });
      if (response.status === "aborted") {
        // User decided not to navigate to the external link
        console.log("User aborted navigation to:", url);
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
    }
  };

  // Helper to check if URL is valid for Canva (must be HTTPS)
  // Canva does NOT support HTTP URLs (including localhost) for security reasons
  const isValidCanvaUrl = (url: string): boolean => {
    return url.startsWith('https://');
  };

  // Preview Screen - shown initially
  if (authState === 'preview') {
    // Use WEBAPP_FRONTEND_URL from environment variable
    // Note: Canva only supports HTTPS URLs, so ensure your WEBAPP_FRONTEND_URL uses https://
    const webappUrl = WEBAPP_FRONTEND_URL || '';
    const termsUrl = webappUrl && isValidCanvaUrl(webappUrl) ? `${webappUrl}/terms` : '';
    const privacyUrl = webappUrl && isValidCanvaUrl(webappUrl) ? `${webappUrl}/privacy-policy` : '';

    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
          {/* Preview Image */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            paddingTop="2u"
            paddingBottom="2u"
          >
            <img
              src={appPreview}
              alt="DayWise Booking Preview"
              style={{
                width: '100%',
                maxWidth: '600px',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </Box>

          {/* Description */}
          <Box>
            <Title size="medium">
              Easily add a booking form to your Canva website
            </Title>
            <Text size="medium">
              Let your customers book appointments with your business directly on your Canva website. Set up in minutes and start taking bookings right away.
            </Text>
          </Box>

          {/* Permissions Info */}
          <Box>
            <Rows spacing="1u">
              <Title size="small">Permissions</Title>
              <Text size="small">
                ✓ Read and change the contents of the design
              </Text>
            </Rows>
          </Box>

          {/* Open Button */}
          <Box paddingTop="2u">
            <Button
              variant="primary"
              onClick={handleOpenApp}
              stretch
            >
              Open
            </Button>
          </Box>

          {/* Legal Disclaimer */}
          <Box paddingBottom="2u">
            <Text size="small">
              By using this app, you agree to its{' '}
              {termsUrl && privacyUrl ? (
                <>
                  <Link
                    href={termsUrl}
                    requestOpenExternalUrl={() => openExternalUrl(termsUrl)}
                    ariaLabel="Terms & Conditions"
                  >
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link
                    href={privacyUrl}
                    requestOpenExternalUrl={() => openExternalUrl(privacyUrl)}
                    ariaLabel="Privacy Policy"
                  >
                    Privacy policy
                  </Link>
                  {' '}and permissions
                </>
              ) : (
                'Terms & Conditions and Privacy policy and permissions'
              )}
            </Text>
          </Box>
        </Rows>
      </div>
    );
  }

  // Loading state
  if (authState === 'checking') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="2u">
          <Title>DayWise Booking</Title>
          <Text>Loading...</Text>
        </Rows>
      </div>
    );
  }

  // Connect Account Screen (matches user's design)
  if (authState === 'connect' || authState === 'authenticating') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u" align="center">
          {/* Spacer for vertical centering */}
          <Box paddingTop="8u" />

          {/* Title */}
          <Title size="medium" alignment="center">
            Create a free account or sign in to Daywise to get started
          </Title>

          {/* DayWise Logo - centered, larger */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            paddingTop="4u"
            paddingBottom="4u"
          >
            <img
              src={daywiseLogo}
              alt="DayWise Logo"
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'contain'
              }}
            />
          </Box>

          {/* Connect Button - purple/primary color, full width */}
          <Box paddingStart="4u" paddingEnd="4u">
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={authState === 'authenticating'}
              stretch
            >
              {authState === 'authenticating' ? 'Connecting...' : 'Connect'}
            </Button>
          </Box>

          {/* Error message */}
          {error && (
            <Box paddingStart="4u" paddingEnd="4u">
              <Text tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          )}

          {/* Bottom spacer */}
          <Box paddingBottom="8u" />
        </Rows>
      </div>
    );
  }

  // Authenticated state - simplified UI with disconnect option
  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="3u" align="center">
        <Box paddingTop="4u" paddingBottom="2u">
          <img
            src={daywiseLogo}
            alt="DayWise"
            style={{ width: '100px', height: '100px', objectFit: 'contain' }}
          />
        </Box>
        <Title size="medium" alignment="center">Account connected</Title>
        <Text alignment="center">
          You're signed in with DayWise. Disconnect below to choose a different Google account or relink.
        </Text>
        <Box paddingStart="4u" paddingEnd="4u" paddingTop="2u" paddingBottom="4u">
          <Button variant="secondary" onClick={handleDisconnect} stretch>
            Disconnect
          </Button>
        </Box>
        {error && (
          <Box paddingStart="4u" paddingEnd="4u">
            <Text tone="critical" alignment="center">
              {error}
            </Text>
          </Box>
        )}
      </Rows>
    </div>
  );
};
