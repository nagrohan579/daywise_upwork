import { Button, Rows, Text, Title, Box, FormField, Select, Columns, Link } from "@canva/app-ui-kit";
import { auth, type AccessTokenResponse } from "@canva/user";
import { useState, useEffect, useMemo, useCallback } from "react";
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

type AppointmentType = {
  _id: string;
  name: string;
  duration: number;
  description?: string;
  color?: string;
};

type TimeSlot = {
  display: string;
  original: string;
};

export const App = () => {
  // Initialize Canva OAuth client for Google authentication
  const oauth = useMemo(() => auth.initOauth(), []);
  
  const [authState, setAuthState] = useState<AuthState>('preview');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Booking state
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [loadingAppointmentTypes, setLoadingAppointmentTypes] = useState(false);

  // Don't auto-check auth on mount - wait for user to click "Open" from preview
  // useEffect(() => {
  //   checkAuthStatus();
  // }, []);

  const handleOpenApp = () => {
    setAuthState('checking');
    checkAuthStatus();
  };

  // Fetch appointment types when authenticated
  useEffect(() => {
    if (authState === 'authenticated' && user) {
      fetchAppointmentTypes();
    }
  }, [authState, user]);

  // Fetch time slots when appointment type and date are selected
  useEffect(() => {
    if (selectedAppointmentType && selectedDate && user) {
      fetchTimeSlots();
    } else {
      setAvailableTimeSlots([]);
      setSelectedTime(null);
    }
  }, [selectedAppointmentType, selectedDate, user]);

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
      // This will open Canva's authorization UI if not already authorized
      const scope = new Set(["openid", "email", "profile"]);
      await oauth.requestAuthorization({ scope });
      
      // Get the access token from Canva (Google access token)
      const tokenResponse: AccessTokenResponse = await oauth.getAccessToken({ scope });
      
      if (!tokenResponse || !tokenResponse.token) {
        throw new Error('Failed to get access token');
      }

      // Get Canva user token for backend authentication
      const canvaToken = await auth.getCanvaUserToken();
      
      // Send Google access token to backend to link account
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Successfully authenticated
      setUser(data.user);
      setAuthState('authenticated');
      
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Authentication failed');
      setAuthState('connect');
    }
  }, [oauth]);

  const fetchAppointmentTypes = async () => {
    setLoadingAppointmentTypes(true);
    try {
      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';
      const res = await fetch(`${backendHost}/api/appointment-types`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setAppointmentTypes(data || []);
        // Auto-select first appointment type if available
        if (data && data.length > 0 && !selectedAppointmentType) {
          setSelectedAppointmentType(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching appointment types:', err);
    } finally {
      setLoadingAppointmentTypes(false);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedAppointmentType || !selectedDate || !user) return;

    setLoadingTimeSlots(true);
    try {
      const token = await auth.getCanvaUserToken();
      
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const backendHost = BACKEND_HOST || 'http://localhost:3000';
      
      const res = await fetch(
        `${backendHost}/api/availability/slots?userId=${user._id || user.id}&appointmentTypeId=${selectedAppointmentType._id}&date=${dateStr}&customerTimezone=${encodeURIComponent(timezone)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );

      if (res.ok) {
        const data = await res.json();
        const slots = (data.slots || []).map((slot: string) => ({
          display: slot,
          original: slot
        }));
        setAvailableTimeSlots(slots);
      } else {
        setAvailableTimeSlots([]);
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

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

  // Authenticated state - main app UI (booking interface)
  // Get current month and year for calendar
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Generate calendar days for current month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Format time for display (convert 24h to 12h)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className={styles.scrollContainer}>
      <Columns spacing="4u" alignY="stretch">
        {/* Left Column */}
        <Box>
          <Rows spacing="3u">
            {/* Logo */}
            <Box display="flex" alignItems="center" paddingBottom="2u">
              <img
                src={daywiseLogo}
                alt="DayWise"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            </Box>

            {/* Welcome Section */}
            <Box>
              <Text size="large" weight="bold">
                Welcome to my business!
              </Text>
            </Box>

            {/* Appointment Type Selector */}
            <FormField
              label="Select Appointment Type"
              value={selectedAppointmentType?.name || ''}
              control={(props) => (
                <Select
                  {...props}
                  options={appointmentTypes.map(type => ({
                    value: type._id,
                    label: type.name
                  }))}
                  onChange={(value) => {
                    const type = appointmentTypes.find(t => t._id === value);
                    setSelectedAppointmentType(type || null);
                  }}
                  disabled={loadingAppointmentTypes}
                />
              )}
            />

            {/* Description */}
            {selectedAppointmentType?.description && (
              <Box>
                <Text size="small">
                  {selectedAppointmentType.description}
                </Text>
              </Box>
            )}
            {!selectedAppointmentType?.description && (
              <Box>
                <Text size="small">
                  The service/Appointment description goes here if it has one.
                </Text>
              </Box>
            )}
          </Rows>
        </Box>

        {/* Right Column */}
        <Box>
          <Rows spacing="3u">
            <Title size="small">Select a Date & Time</Title>

            {/* Calendar */}
            <Box>
              <Text size="small" weight="bold" alignment="center">
                {monthNames[currentMonth]} {currentYear}
              </Text>
              
              {/* Day headers */}
              <Box display="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '8px' }}>
                {dayNames.map(day => (
                  <Box key={day} padding="1u">
                    <Text size="small" alignment="center">
                      {day}
                    </Text>
                  </Box>
                ))}
              </Box>

              {/* Calendar days */}
              <Box display="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {/* Empty cells for days before month starts */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <Box key={`empty-${i}`} padding="1u" />
                ))}
                
                {/* Days of the month */}
                {days.map(day => {
                  const date = new Date(currentYear, currentMonth, day);
                  const isSelected = selectedDate && 
                    selectedDate.getDate() === day && 
                    selectedDate.getMonth() === currentMonth &&
                    selectedDate.getFullYear() === currentYear;
                  const isToday = day === today.getDate() && 
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  
                  return (
                    <Box
                      key={day}
                      padding="1u"
                      onClick={() => handleDateSelect(date)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#4285F4' : 'transparent',
                        color: isSelected ? 'white' : isToday ? '#4285F4' : 'inherit',
                        textAlign: 'center',
                        fontWeight: isToday ? 'bold' : 'normal'
                      }}
                    >
                      <Text size="small" alignment="center">
                        {day}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Time Slots */}
            <Box>
              {loadingTimeSlots ? (
                <Text alignment="center">Loading time slots...</Text>
              ) : availableTimeSlots.length > 0 ? (
                <Rows spacing="1u">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.original;
                    return (
                      <Box key={slot.original}>
                        {isSelected ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            padding="2u"
                            style={{
                              backgroundColor: '#4285F4',
                              color: 'white',
                              borderRadius: '4px'
                            }}
                          >
                            <Text weight="bold">{formatTime(slot.display)}</Text>
                            <Button
                              variant="primary"
                              onClick={handleNext}
                              size="small"
                            >
                              Next
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => handleTimeSelect(slot.original)}
                            stretch
                          >
                            {formatTime(slot.display)}
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Rows>
              ) : selectedDate && selectedAppointmentType ? (
                <Text alignment="center">
                  No available time slots for this date
                </Text>
              ) : (
                <Text alignment="center">
                  Select an appointment type and date to see available time slots
                </Text>
              )}
            </Box>

            {/* Timezone */}
            <Box>
              <Text size="small">
                {Intl.DateTimeFormat().resolvedOptions().timeZone} {Intl.DateTimeFormat().resolvedOptions().timeZoneName}
              </Text>
            </Box>
          </Rows>
        </Box>
      </Columns>
    </div>
  );
};
