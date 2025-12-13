import { Button, Rows, Text, Title, Box, Link, FormField, TextInput, Select, Columns, Column, Switch, OpenInNewIcon } from "@canva/app-ui-kit";
import { auth, type AccessTokenResponse } from "@canva/user";
import { requestOpenExternalUrl } from "@canva/platform";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  const oauth = useMemo(() => {
    try {
      return auth.initOauth();
    } catch (error) {
      console.error('Error initializing OAuth:', error);
      // Return a safe fallback
      return {
        requestAuthorization: async () => ({ status: 'aborted' as const }),
        getAccessToken: async () => null,
        deauthorize: async () => {},
      } as any;
    }
  }, []);
  
  const [authState, setAuthState] = useState<AuthState>('preview');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Onboarding form state
  const [onboardingStep, setOnboardingStep] = useState<'step2' | 'step3' | 'step4'>('step2');
  const [businessName, setBusinessName] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  
  // Weekly availability state - each day has enabled flag and time range
  type DayAvailability = {
    enabled: boolean;
    startTime: string; // Format: "HH:MM" (24-hour)
    endTime: string; // Format: "HH:MM" (24-hour)
  };
  
  const [weeklyAvailability, setWeeklyAvailability] = useState<Record<string, DayAvailability>>({
    monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '17:00' },
  });

  // Set default timezone when authenticated - matches frontend logic
  useEffect(() => {
    if (authState === 'authenticated' && !timezone) {
      try {
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Supported timezones from frontend
        const supportedTimezones = [
          'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
          'America/Halifax', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London',
          'Europe/Lisbon', 'Europe/Berlin', 'Europe/Athens', 'Asia/Dubai',
          'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
          'Australia/Sydney', 'Pacific/Auckland', 'America/Sao_Paulo', 'Etc/UTC'
        ];
        
        // Direct match
        if (supportedTimezones.includes(currentTimezone)) {
          setTimezone(currentTimezone);
        } else {
          // Simple mapping for common timezone aliases (matching frontend logic)
          const timezoneMap: Record<string, string> = {
            'America/Tijuana': 'America/Los_Angeles',
            'America/Vancouver': 'America/Los_Angeles',
            'America/Phoenix': 'America/Denver',
            'America/Boise': 'America/Denver',
            'America/Mexico_City': 'America/Chicago',
            'America/Toronto': 'America/New_York',
            'America/Montreal': 'America/New_York',
            'America/Detroit': 'America/New_York',
            'Europe/Paris': 'Europe/Berlin',
            'Europe/Rome': 'Europe/Berlin',
            'Europe/Amsterdam': 'Europe/Berlin',
            'Europe/Madrid': 'Europe/Berlin',
            'Asia/Hong_Kong': 'Asia/Shanghai',
            'Asia/Taipei': 'Asia/Shanghai',
            'Asia/Kuala_Lumpur': 'Asia/Singapore',
            'Australia/Melbourne': 'Australia/Sydney',
            'UTC': 'Etc/UTC',
            'GMT': 'Etc/UTC',
          };
          
          const mappedTimezone = timezoneMap[currentTimezone] || 'Etc/UTC';
          setTimezone(mappedTimezone);
        }
      } catch (error) {
        console.error('Error setting timezone:', error);
        // Fallback to UTC if timezone detection fails
        setTimezone('Etc/UTC');
      }
    }
  }, [authState, timezone]);

  const handleOpenApp = () => {
    try {
      setAuthState('checking');
      checkAuthStatus().catch((error) => {
        console.error('Error in checkAuthStatus:', error);
        setAuthState('connect');
      });
    } catch (error) {
      console.error('Error in handleOpenApp:', error);
      setAuthState('connect');
    }
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
      const scope = new Set(["openid", "email", "profile"]);
      
      // Try to get access token first (if already authorized, this works immediately)
      let tokenResponse: AccessTokenResponse | null = await oauth.getAccessToken({ scope });
      
      // If not authorized, request authorization (this will show Canva's intermediate screen)
      if (!tokenResponse || !tokenResponse.token) {
        const authResponse = await oauth.requestAuthorization({ scope });
        
        // If user aborted, stop here
        if (authResponse.status === 'aborted') {
          setAuthState('connect');
          return;
        }
        
        // After authorization, get the access token
        tokenResponse = await oauth.getAccessToken({ scope });
        if (!tokenResponse || !tokenResponse.token) {
          throw new Error('Failed to get access token after authorization');
        }
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
      setError('');
      setOnboardingStep('step2');
      setAuthState('connect');
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect');
    }
  }, []);

  // Helper function to open external URLs
  const openExternalUrl = async (url: string) => {
    if (!url.startsWith('https://')) {
      console.warn('Canva only supports HTTPS URLs for external links. URL must start with https://');
      return;
    }
    
    try {
      const response = await requestOpenExternalUrl({ url });
      if (response.status === "aborted") {
        console.log("User aborted navigation to:", url);
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
    }
  };

  const isValidCanvaUrl = (url: string): boolean => {
    return url.startsWith('https://');
  };

  // Simple ref to track if dashboard button was clicked (prevents double-clicks)
  const dashboardClickedRef = useRef(false);

  const handleOpenDashboard = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onboardingStep !== 'step4') {
      return;
    }
    
    if (dashboardClickedRef.current) {
      return;
    }
    
    dashboardClickedRef.current = true;
    
    try {
      await openExternalUrl('https://app.daywisebooking.com/login');
    } catch (error) {
      console.error('Error opening dashboard:', error);
      dashboardClickedRef.current = false;
    }
    
    setTimeout(() => {
      dashboardClickedRef.current = false;
    }, 2000);
  }, [onboardingStep]);

  const handleAddFormToPage = () => {
    console.log('Add form to page');
  };

  const handleBack = () => {
    if (onboardingStep === 'step4') {
      setOnboardingStep('step3');
    } else if (onboardingStep === 'step3') {
      setOnboardingStep('step2');
    } else {
      setAuthState('connect');
    }
  };

  const handleStep2Next = () => {
    console.log('Step 2 data:', {
      businessName,
      appointmentType,
      duration,
      timezone
    });
    setOnboardingStep('step3');
  };

  const handleStep3Next = () => {
    console.log('Step 3 data:', weeklyAvailability);
    setOnboardingStep('step4');
  };

  const handleDayToggle = (day: string, enabled: boolean) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled }
    }));
  };

  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const formatTimeForDisplay = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const parseTimeFromDisplay = (time12: string): string => {
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '09:00';
    let hour = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minutes}`;
  };

  // Preview Screen - shown initially
  if (authState === 'preview') {
    const webappUrl = WEBAPP_FRONTEND_URL || '';
    const termsUrl = webappUrl && isValidCanvaUrl(webappUrl) ? `${webappUrl}/terms` : '';
    const privacyUrl = webappUrl && isValidCanvaUrl(webappUrl) ? `${webappUrl}/privacy-policy` : '';

    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
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

          <Box>
            <Title size="medium">
              Easily add a booking form to your Canva website
            </Title>
            <Text size="medium">
              Let your customers book appointments with your business directly on your Canva website. Set up in minutes and start taking bookings right away.
            </Text>
          </Box>

          <Box>
            <Rows spacing="1u">
              <Title size="small">Permissions</Title>
              <Text size="small">
                ✓ Read and change the contents of the design
              </Text>
            </Rows>
          </Box>

          <Box paddingTop="2u">
            <Button
              variant="primary"
              onClick={handleOpenApp}
              stretch
            >
              Open
            </Button>
          </Box>

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

  // Connect Account Screen
  if (authState === 'connect' || authState === 'authenticating') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u" align="center">
          <Box paddingTop="8u" />
          <Title size="medium" alignment="center">
            Create a free account or sign in to Daywise to get started
          </Title>
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
          {error && (
            <Box paddingStart="4u" paddingEnd="4u">
              <Text tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          )}
          <Box paddingBottom="8u" />
        </Rows>
      </div>
    );
  }

  // Authenticated state - onboarding steps
  const durationOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ];

  const timezoneOptions = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT) (GMT-8)' },
    { value: 'America/Denver', label: 'Mountain Time (MT) (GMT-7)' },
    { value: 'America/Chicago', label: 'Central Time (CT) (GMT-6)' },
    { value: 'America/New_York', label: 'Eastern Time (ET) (GMT-5)' },
    { value: 'America/Halifax', label: 'Atlantic Time (AT) (GMT-4)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST) (GMT-9)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST) (GMT-10)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) (GMT+0)' },
    { value: 'Europe/Lisbon', label: 'Western European Time (WET) (GMT+0)' },
    { value: 'Europe/Berlin', label: 'Central European Time (CET) (GMT+1)' },
    { value: 'Europe/Athens', label: 'Eastern European Time (EET) (GMT+2)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) (GMT+4)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST) (GMT+5)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST) (GMT+8)' },
    { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT) (GMT+8)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) (GMT+9)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) (GMT+10)' },
    { value: 'Pacific/Auckland', label: 'New Zealand Standard Time (NZST) (GMT+12)' },
    { value: 'America/Sao_Paulo', label: 'Brasília Time (BRT) (GMT-3)' },
    { value: 'Etc/UTC', label: 'Coordinated Universal Time (UTC) (GMT+0)' },
  ];

  // Step 4: Completion Screen
  if (onboardingStep === 'step4') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u" align="center">
          <Box paddingTop="4u" />
          <Title size="medium" alignment="center">You're all set!</Title>
          <Box paddingTop="2u" width="full">
            <Button variant="primary" onClick={handleAddFormToPage} stretch>
              Add Form to Page
            </Button>
          </Box>
          <Box width="full">
            <Button 
              variant="secondary" 
              onClick={handleOpenDashboard} 
              stretch 
              icon={OpenInNewIcon}
              aria-label="Open Dashboard"
              type="button"
            >
              Open Dashboard
            </Button>
          </Box>
          <Box paddingTop="1u">
            <Text size="small" alignment="center">
              Congrats! Your booking form is ready. To configure additional services, branding, or advanced settings, open the full dashboard.
            </Text>
          </Box>
          <Box paddingTop="2u" width="full">
            <Button variant="secondary" onClick={handleBack} stretch>
              Back
            </Button>
          </Box>
          {error && (
            <Box paddingStart="4u" paddingEnd="4u">
              <Text tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          )}
          <Box paddingTop="4u" paddingBottom="2u">
            <Button variant="secondary" onClick={handleDisconnect} stretch>
              Disconnect
            </Button>
          </Box>
          <Box paddingBottom="4u" />
        </Rows>
      </div>
    );
  }

  // Step 3: Weekly Availability
  if (onboardingStep === 'step3') {
    const days = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' },
    ];

    const timeOptions = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayTime = formatTimeForDisplay(time24);
        timeOptions.push({ value: time24, label: displayTime });
      }
    }

    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
          <Title size="medium">Set your weekly availability</Title>
          {days.map((day) => {
            const availability = weeklyAvailability[day.key];
            return (
              <Box key={day.key}>
                <Rows spacing="2u">
                  <Columns spacing="2u" alignY="center">
                    <Column>
                      <Text size="medium" weight="bold">{day.label}</Text>
                    </Column>
                    <Column width="content">
                      <Switch
                        checked={availability.enabled}
                        onChange={(checked) => handleDayToggle(day.key, checked)}
                      />
                    </Column>
                  </Columns>
                  {availability.enabled && (
                    <Columns spacing="2u">
                      <Column>
                        <Rows spacing="1u">
                          <Text size="small" tone="tertiary">Start Time</Text>
                          <Select
                            stretch
                            value={availability.startTime}
                            options={timeOptions}
                            onChange={(value) => handleTimeChange(day.key, 'startTime', value)}
                          />
                        </Rows>
                      </Column>
                      <Column>
                        <Rows spacing="1u">
                          <Text size="small" tone="tertiary">End Time</Text>
                          <Select
                            stretch
                            value={availability.endTime}
                            options={timeOptions}
                            onChange={(value) => handleTimeChange(day.key, 'endTime', value)}
                          />
                        </Rows>
                      </Column>
                    </Columns>
                  )}
                </Rows>
              </Box>
            );
          })}
          <Box paddingTop="2u">
            <Columns spacing="2u">
              <Column>
                <Button variant="secondary" onClick={handleBack} stretch>
                  Back
                </Button>
              </Column>
              <Column>
                <Button variant="primary" onClick={handleStep3Next} stretch>
                  Next
                </Button>
              </Column>
            </Columns>
          </Box>
          {error && (
            <Box>
              <Text tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          )}
          <Box paddingTop="4u" paddingBottom="2u">
            <Button variant="secondary" onClick={handleDisconnect} stretch>
              Disconnect
            </Button>
          </Box>
        </Rows>
      </div>
    );
  }

  // Step 2: Business Details
  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="3u">
        <FormField
          label="Business name"
          value={businessName}
          control={(props) => (
            <TextInput
              {...props}
              placeholder="Enter your business name"
              onChange={(value) => setBusinessName(value)}
            />
          )}
        />
        <FormField
          label="Add an appointment type"
          value={appointmentType}
          control={(props) => (
            <TextInput
              {...props}
              placeholder="Add a service/appointment type"
              onChange={(value) => setAppointmentType(value)}
            />
          )}
        />
        <FormField
          label="Duration"
          value={duration}
          control={(props) => (
            <Select
              {...props}
              stretch
              placeholder="Duration"
              options={durationOptions}
              onChange={(value) => setDuration(value)}
            />
          )}
        />
        <FormField
          label="Select your timezone"
          value={timezone}
          control={(props) => (
            <Select
              {...props}
              stretch
              placeholder="Select timezone"
              options={timezoneOptions}
              onChange={(value) => setTimezone(value)}
            />
          )}
        />
        <Box paddingTop="2u">
          <Columns spacing="2u">
            <Column>
              <Button variant="secondary" onClick={handleBack} stretch>
                Back
              </Button>
            </Column>
            <Column>
              <Button variant="primary" onClick={handleStep2Next} stretch>
                Next
              </Button>
            </Column>
          </Columns>
        </Box>
        {error && (
          <Box>
            <Text tone="critical" alignment="center">
              {error}
            </Text>
          </Box>
        )}
        <Box paddingTop="4u" paddingBottom="2u">
          <Button variant="secondary" onClick={handleDisconnect} stretch>
            Disconnect
          </Button>
        </Box>
      </Rows>
    </div>
  );
};
