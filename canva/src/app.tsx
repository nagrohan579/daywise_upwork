import { Button, Rows, Text, Title, Box, Link, FormField, TextInput, Select, Columns, Column, Switch, OpenInNewIcon, TrashIcon, FileInput } from "@canva/app-ui-kit";
import { auth, type AccessTokenResponse } from "@canva/user";
import { requestOpenExternalUrl } from "@canva/platform";
import { initAppElement } from "@canva/design";
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
const UPGRADE_FALLBACK_URL = "https://app.daywisebooking.com/pricing";

type AuthState = 'preview' | 'checking' | 'connect' | 'authenticating' | 'authenticated';

// App element data structure for embed elements
type EmbedAppElementData = {
  url: string;
  width: number;
  height: number;
};

// Initialize the app element client for embed elements
// This allows the embed to be resizable and re-editable
const embedAppElementClient = initAppElement<EmbedAppElementData>({
  render: (data) => {
    // Return an embed element with the app element data
    // The top/left positioning is handled by Canva when the user places the element
    return [{ type: "embed", ...data, top: 0, left: 0 }];
  },
});

interface BookingCardData {
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  availability: Array<{
    day: string;
    times: string;
  }>;
  branding: {
    primary: string;
    secondary: string;
    accent: string;
    logoUrl: string | null;
  };
  dataVersion: string;
  businessName: string;
  slug: string;
}

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
  const [onboardingStep, setOnboardingStep] = useState<'step2' | 'services' | 'step3' | 'design' | 'step4'>('step2');
  const [activeTab, setActiveTab] = useState<'setup' | 'manage'>('setup');
  const [businessName, setBusinessName] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  const [services, setServices] = useState<Array<{ id: string; name: string; duration: string; price: string }>>([
    { id: 'svc-1', name: '', duration: '', price: '' },
  ]);
  // Match frontend Branding defaults
  const [mainColor, setMainColor] = useState('#0053F1');
  const [secondaryColor, setSecondaryColor] = useState('#64748B');
  const [textColor, setTextColor] = useState('#121212');
  const [logoName, setLogoName] = useState('');
  const [logoError, setLogoError] = useState('');
  const logoAcceptTypes = ['image/png', 'image/jpeg', 'image/gif'];
  const mainColorInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryColorInputRef = useRef<HTMLInputElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const planCheckedRef = useRef(false);
  const [hasDataChanges, setHasDataChanges] = useState(false);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const renderColorSwatch = (
    label: string,
    color: string,
    setColor: (val: string) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => (
    <Box paddingBottom="2u">
      <Columns alignY="center" spacing="2u">
        <Column>
          <Text size="small">{label}</Text>
        </Column>
        <Column width="content">
          <div
            onClick={() => inputRef.current?.click()}
            aria-label={label}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid #d5d9e2',
              backgroundColor: color,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          />
          <input
            ref={inputRef}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ display: 'none' }}
          />
        </Column>
      </Columns>
    </Box>
  );

  const handleUpgradeToPro = useCallback(async () => {
    try {
      // Get Canva user token for backend authentication
      const token = await auth.getCanvaUserToken();

      const res = await fetch(`${BACKEND_URL}/checkout/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Canva upgrade checkout failed:", data);
        // Fallback to pricing page so something still opens
        await requestOpenExternalUrl({ url: UPGRADE_FALLBACK_URL });
        return;
      }

      const data = await res.json();
      const checkoutUrl = data.url;
      if (!checkoutUrl) {
        console.error("Canva upgrade checkout: no URL returned from backend");
        await requestOpenExternalUrl({ url: UPGRADE_FALLBACK_URL });
        return;
      }

      // Open the Stripe Checkout page in an external browser window
      await requestOpenExternalUrl({ url: checkoutUrl });
    } catch (error) {
      console.error("Error starting Canva upgrade checkout:", error);
      // Fallback if anything goes wrong
      await requestOpenExternalUrl({ url: UPGRADE_FALLBACK_URL });
    }
  }, []);

  const renderPlanBanner = () => {
    if (isPro !== false) {
      return null;
    }

    return (
      <Box paddingTop="2u" paddingBottom="2u">
        <Text size="small" tone="tertiary" alignment="center">
          You&apos;re using Daywise Booking Free
        </Text>
        <Box paddingTop="0.5u" display="flex" justifyContent="center">
          <Link
            href={UPGRADE_FALLBACK_URL}
            requestOpenExternalUrl={handleUpgradeToPro}
            ariaLabel="Upgrade to Daywise Booking Pro"
          >
            Upgrade to Daywise Booking Pro
          </Link>
        </Box>
      </Box>
    );
  };
  
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

  // Poll for data changes every 30 seconds
  useEffect(() => {
    if (authState === 'authenticated') {
      checkForDataChanges();

      pollingIntervalRef.current = setInterval(() => {
        checkForDataChanges();
      }, 30000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [authState]);

  const checkForDataChanges = async () => {
    try {
      setIsCheckingChanges(true);
      const currentVersion = localStorage.getItem('daywise_card_version');

      if (!currentVersion) {
        return;
      }

      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';

      const response = await fetch(`${backendHost}/api/canva/check-data-version`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentVersion })
      });

      if (response.ok) {
        const data = await response.json();
        setHasDataChanges(data.hasChanges);
      }
    } catch (error) {
      console.error('Error checking for data changes:', error);
    } finally {
      setIsCheckingChanges(false);
    }
  };

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
        fetchCanvaPlan().catch((err) =>
          console.error('Error fetching Canva plan after auth status:', err)
        );
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
  }, [oauth, checkAuthStatus]);

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

  const fetchCanvaPlan = useCallback(async () => {
    if (planCheckedRef.current) {
      return;
    }
    planCheckedRef.current = true;

    try {
      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';

      const res = await fetch(`${backendHost}/api/canva/user-subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to fetch Canva user subscription');
        return;
      }

      const data = await res.json();
      const pro = !!data.features?.customBranding;
      setIsPro(pro);
    } catch (error) {
      console.error('Error fetching Canva user subscription:', error);
    }
  }, []);

  const handleOpenDashboard = useCallback(async () => {
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
  }, []);

  const renderTabs = () => (
    <Box paddingBottom="2u">
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'setup' ? '' : styles.tabButtonInactive}`}
          onClick={() => setActiveTab('setup')}
        >
          <Text size="medium" weight={activeTab === 'setup' ? 'bold' : 'regular'} alignment="center">
            Setup
          </Text>
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'manage' ? '' : styles.tabButtonInactive}`}
          onClick={() => setActiveTab('manage')}
        >
          <Text size="medium" weight={activeTab === 'manage' ? 'bold' : 'regular'} alignment="center">
            Manage
          </Text>
        </button>
        <div
          className={styles.tabIndicator}
          style={{ transform: activeTab === 'setup' ? 'translateX(0%)' : 'translateX(100%)' }}
        />
      </div>
    </Box>
  );

  const manageContent = (
    <Rows spacing="2u">
      <Title size="medium">Manage your bookings</Title>
      <Text>
        View bookings, update services, availability, and advanced settings in your Daywise dashboard.
      </Text>
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
    </Rows>
  );

  const handleAddEmbedToPage = async () => {
    try {
      setError('');
      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';

      // Fetch user slug
      const response = await fetch(`${backendHost}/api/canva/user-slug`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get user slug');
      }

      const userData = await response.json();
      const slug = userData.slug;

      if (!slug) {
        throw new Error('User does not have a booking page. Please complete your profile setup.');
      }

      // Construct booking page URL with embed parameters for Iframely/oEmbed
      // Iframely will fetch oEmbed data and use maxwidth/maxheight parameters
      const frontendUrl = WEBAPP_FRONTEND_URL || 'https://app.daywisebooking.com';
      const bookingPageUrl = `${frontendUrl}/${slug}`;
      
      // Add URL parameters that will be passed to oEmbed endpoint via Iframely
      // These ensure the oEmbed response returns the correct dimensions
      const embedUrl = new URL(bookingPageUrl);
      embedUrl.searchParams.set('embed', 'true');
      embedUrl.searchParams.set('maxwidth', '800');
      embedUrl.searchParams.set('maxheight', '600');

      console.log('Adding embed to design:', embedUrl.toString());

      // Add embed element using app element for resizable functionality
      // App elements allow users to resize the embed element in Canva
      // The dimensions here set the initial size, and users can resize in Canva
      await embedAppElementClient.addElement({
        data: {
          url: embedUrl.toString(),
          width: 800,
          height: 600,
        },
      });

      console.log('✅ Booking page embed successfully added to design!');
      console.log('🔗 When published as Canva Website, this will show:', bookingPageUrl);

    } catch (err: any) {
      console.error('Error adding embed to page:', err);
      setError(err.message || 'Failed to add booking page embed');
    }
  };

  const buildBookingCardElements = (data: BookingCardData) => {
    const { services, availability, branding, businessName } = data;
    
    // Extract branding colors
    const primaryColor = branding.primary || "#0053F1";
    const secondaryColor = branding.secondary || "#64748B";
    const textColor = branding.accent || "#121212";
    
    // Helper function to lighten a hex color (for backgrounds)
    // Returns a very light tint (2% opacity equivalent on white)
    const getLightTint = (hex: string): string => {
      // For primary color, return very light blue tint
      if (hex === "#0053F1" || hex.toLowerCase() === "#0053f1") {
        return "#FAFBFF";
      }
      // For other colors, return a light gray tint
      return "#F5F6F8";
    };
    
    // Helper function to get a light border color (20% opacity equivalent)
    const getLightBorder = (hex: string): string => {
      // For secondary color, return light gray border
      if (hex === "#64748B" || hex.toLowerCase() === "#64748b") {
        return "#E0E3E8";
      }
      // For other colors, calculate a lighter version
      return "#E0E3E8";
    };

    // Figma design dimensions
    const CARD_WIDTH = 667;
    const CARD_HEIGHT = 412;
    const CARD_PADDING_TOP = 30;
    const CARD_PADDING_LEFT = 48;
    
    // Left section dimensions
    const LEFT_SECTION_WIDTH = 155;
    const LOGO_SIZE = 52;
    const LEFT_SECTION_GAP = 22;
    
    // Right section dimensions
    const RIGHT_SECTION_WIDTH = 280;
    const RIGHT_SECTION_GAP = 30;
    
    // Divider
    const DIVIDER_WIDTH = 1;
    const DIVIDER_HEIGHT = 352;
    const DIVIDER_GAP = 68;
    
    // Service box dimensions
    const SERVICE_BOX_HEIGHT = 64;
    const SERVICE_BOX_PADDING = 12;
    const SERVICE_BOX_GAP = 10;
    
    // Availability box dimensions
    const AVAILABILITY_BOX_HEIGHT = 64;
    
    // Button dimensions
    const BUTTON_WIDTH = 280;
    const BUTTON_HEIGHT = 40;
    
    const elements: any[] = [];
    
    // Main card background - using simple rectangle (Canva doesn't support Q commands for rounded corners)
    // Note: For rounded corners, we'll use a simple rectangle. Canva will handle the visual appearance.
    const bgPath = `M 0 0 H ${CARD_WIDTH} V ${CARD_HEIGHT} H 0 L 0 0 Z`;
    
    elements.push({
      type: "shape",
      paths: [{
        d: bgPath,
        fill: { color: "#FFFFFF", dropTarget: false }
      }],
      viewBox: { width: CARD_WIDTH, height: CARD_HEIGHT, top: 0, left: 0 },
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      top: 0,
      left: 0
    });
    
    // Left section - starting position
    const leftSectionTop = CARD_PADDING_TOP;
    const leftSectionLeft = CARD_PADDING_LEFT;
    let leftCurrentY = leftSectionTop;
    
    // Logo placeholder (52x52 square - Canva doesn't support A commands for circles easily)
    // Using a simple square shape
    const logoPath = `M 0 0 H ${LOGO_SIZE} V ${LOGO_SIZE} H 0 L 0 0 Z`;
    elements.push({
      type: "shape",
      paths: [{
        d: logoPath,
        fill: { color: "#F0F0F0", dropTarget: false }
      }],
      viewBox: { width: LOGO_SIZE, height: LOGO_SIZE, top: 0, left: 0 },
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      top: leftCurrentY,
      left: leftSectionLeft
    });
    
    leftCurrentY += LOGO_SIZE + LEFT_SECTION_GAP;
    
    // Business Name
    elements.push({
      type: "text",
      children: [businessName],
      color: textColor,
      fontWeight: "semibold",
      fontSize: 20,
      width: LEFT_SECTION_WIDTH,
      height: 20,
      top: leftCurrentY,
      left: leftSectionLeft
    });
    
    leftCurrentY += 20 + 10;
    
    // "Book an appointment" text
    elements.push({
      type: "text",
      children: ["Book an appointment"],
      color: secondaryColor,
      fontWeight: "medium",
      fontSize: 14,
      width: LEFT_SECTION_WIDTH,
      height: 20,
      top: leftCurrentY,
      left: leftSectionLeft
    });
    
    // Vertical divider line
    const dividerLeft = leftSectionLeft + LEFT_SECTION_WIDTH + DIVIDER_GAP;
    const dividerTop = CARD_PADDING_TOP;
    elements.push({
      type: "shape",
      paths: [{
        d: `M 0 0 H ${DIVIDER_WIDTH} V ${DIVIDER_HEIGHT} H 0 Z`,
        fill: { color: getLightBorder(secondaryColor), dropTarget: false }
      }],
      viewBox: { width: DIVIDER_WIDTH, height: DIVIDER_HEIGHT, top: 0, left: 0 },
      width: DIVIDER_WIDTH,
      height: DIVIDER_HEIGHT,
      top: dividerTop,
      left: dividerLeft
    });
    
    // Right section - starting position
    const rightSectionTop = CARD_PADDING_TOP;
    const rightSectionLeft = dividerLeft + DIVIDER_WIDTH + DIVIDER_GAP;
    let rightCurrentY = rightSectionTop;
    
    // Services section
    const servicesToShow = services.slice(0, 2); // Show max 2 services in Figma design
    
    // Services header
    elements.push({
      type: "text",
      children: ["Services"],
      color: textColor,
      fontWeight: "semibold",
      fontSize: 14,
      width: RIGHT_SECTION_WIDTH,
      height: 20,
      top: rightCurrentY,
      left: rightSectionLeft
    });
    
    rightCurrentY += 20 + SERVICE_BOX_GAP;
    
    // Service boxes
    if (servicesToShow.length === 0) {
      // Empty state service box
      const serviceBoxTop = rightCurrentY;
      const serviceBoxPath = `M 0 0 H ${RIGHT_SECTION_WIDTH} V ${SERVICE_BOX_HEIGHT} H 0 Z`;
      elements.push({
        type: "shape",
        paths: [{
          d: serviceBoxPath,
          fill: { color: getLightTint(primaryColor), dropTarget: false }
        }],
        viewBox: { width: RIGHT_SECTION_WIDTH, height: SERVICE_BOX_HEIGHT, top: 0, left: 0 },
        width: RIGHT_SECTION_WIDTH,
        height: SERVICE_BOX_HEIGHT,
        top: serviceBoxTop,
        left: rightSectionLeft
      });
      
      elements.push({
        type: "text",
        children: ["No services configured"],
        color: secondaryColor,
        fontWeight: "medium",
        fontSize: 14,
        width: RIGHT_SECTION_WIDTH - (SERVICE_BOX_PADDING * 2),
        height: 20,
        top: serviceBoxTop + SERVICE_BOX_PADDING,
        left: rightSectionLeft + SERVICE_BOX_PADDING
      });
      
      rightCurrentY += SERVICE_BOX_HEIGHT + SERVICE_BOX_GAP;
    } else {
      servicesToShow.forEach((service, index) => {
        const serviceBoxTop = rightCurrentY;
        const serviceBoxPath = `M 0 0 H ${RIGHT_SECTION_WIDTH} V ${SERVICE_BOX_HEIGHT} H 0 Z`;
        
        // Service box background
        elements.push({
          type: "shape",
          paths: [{
            d: serviceBoxPath,
            fill: { color: getLightTint(primaryColor), dropTarget: false }
          }],
          viewBox: { width: RIGHT_SECTION_WIDTH, height: SERVICE_BOX_HEIGHT, top: 0, left: 0 },
          width: RIGHT_SECTION_WIDTH,
          height: SERVICE_BOX_HEIGHT,
          top: serviceBoxTop,
          left: rightSectionLeft
        });
        
        // Service name
        const serviceName = service.name.length > 20 ? service.name.substring(0, 17) + '...' : service.name;
        elements.push({
          type: "text",
          children: [serviceName],
          color: secondaryColor,
          fontWeight: "semibold",
          fontSize: 14,
          width: 87,
          height: 20,
          top: serviceBoxTop + SERVICE_BOX_PADDING,
          left: rightSectionLeft + SERVICE_BOX_PADDING
        });
        
        // Service duration
        elements.push({
          type: "text",
          children: [`${service.duration} min`],
          color: secondaryColor,
          fontWeight: "normal",
          fontSize: 12,
          width: 87,
          height: 15,
          top: serviceBoxTop + SERVICE_BOX_PADDING + 20 + 5,
          left: rightSectionLeft + SERVICE_BOX_PADDING
        });
        
        // Service price (right aligned)
        const priceText = service.price > 0 ? `$${service.price}` : 'Free';
        elements.push({
          type: "text",
          children: [priceText],
          color: secondaryColor,
          fontWeight: "semibold",
          fontSize: 14,
          textAlign: "end",
          width: 28,
          height: 20,
          top: serviceBoxTop + SERVICE_BOX_PADDING,
          left: rightSectionLeft + RIGHT_SECTION_WIDTH - SERVICE_BOX_PADDING - 28
        });
        
        rightCurrentY += SERVICE_BOX_HEIGHT + SERVICE_BOX_GAP;
      });
    }
    
    rightCurrentY += RIGHT_SECTION_GAP - SERVICE_BOX_GAP;
    
    // Availability section
    // Availability header
    elements.push({
      type: "text",
      children: ["Availability"],
      color: textColor,
      fontWeight: "semibold",
      fontSize: 14,
      width: RIGHT_SECTION_WIDTH,
      height: 20,
      top: rightCurrentY,
      left: rightSectionLeft
    });
    
    rightCurrentY += 20 + SERVICE_BOX_GAP;
    
    // Helper function to format availability day range
    // Groups consecutive days with the same times into ranges like "Mon - Fri"
    const formatAvailabilityDayRange = (availability: Array<{ day: string; times: string }>): string => {
      if (availability.length === 0) return "";
      
      // Group by times
      const timesMap = new Map<string, string[]>();
      availability.forEach(avail => {
        if (!timesMap.has(avail.times)) {
          timesMap.set(avail.times, []);
        }
        const daysArray = timesMap.get(avail.times);
        if (daysArray) {
          daysArray.push(avail.day);
        }
      });
      
      // Day order for sorting
      const dayOrder: Record<string, number> = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
      };
      
      // Get the first group (most common or first in array)
      const firstTimes = availability[0]?.times;
      if (!firstTimes) return "";
      
      const days = timesMap.get(firstTimes) || [];
      
      // Sort days
      const sortedDays = days.sort((a, b) => {
        const aOrder = dayOrder[a] ?? 999;
        const bOrder = dayOrder[b] ?? 999;
        return aOrder - bOrder;
      });
      
      if (sortedDays.length === 0) return "";
      
      // If single day, return as is
      if (sortedDays.length === 1) {
        return sortedDays[0] || "";
      }
      
      // Check if days are consecutive
      let isConsecutive = true;
      for (let i = 1; i < sortedDays.length; i++) {
        const prevDay = sortedDays[i - 1];
        const currDay = sortedDays[i];
        if (!prevDay || !currDay) {
          isConsecutive = false;
          break;
        }
        const prevOrder = dayOrder[prevDay] ?? 0;
        const currOrder = dayOrder[currDay] ?? 0;
        if (currOrder !== prevOrder + 1) {
          isConsecutive = false;
          break;
        }
      }
      
      // If consecutive, format as range
      if (isConsecutive) {
        const firstDay = sortedDays[0] || "";
        const lastDay = sortedDays[sortedDays.length - 1] || "";
        return `${firstDay} - ${lastDay}`;
      }
      
      // If not consecutive, show first and last
      const firstDay = sortedDays[0] || "";
      const lastDay = sortedDays[sortedDays.length - 1] || "";
      return `${firstDay} - ${lastDay}`;
    };
    
    // Availability box
    if (availability.length === 0) {
      const availBoxTop = rightCurrentY;
      const availBoxPath = `M 0 0 H ${RIGHT_SECTION_WIDTH} V ${AVAILABILITY_BOX_HEIGHT} H 0 Z`;
      
      elements.push({
        type: "shape",
        paths: [{
          d: availBoxPath,
          fill: { color: getLightTint(primaryColor), dropTarget: false }
        }],
        viewBox: { width: RIGHT_SECTION_WIDTH, height: AVAILABILITY_BOX_HEIGHT, top: 0, left: 0 },
        width: RIGHT_SECTION_WIDTH,
        height: AVAILABILITY_BOX_HEIGHT,
        top: availBoxTop,
        left: rightSectionLeft
      });
      
      elements.push({
        type: "text",
        children: ["No availability set"],
        color: secondaryColor,
        fontWeight: "medium",
        fontSize: 14,
        width: RIGHT_SECTION_WIDTH - (SERVICE_BOX_PADDING * 2),
        height: 20,
        top: availBoxTop + SERVICE_BOX_PADDING,
        left: rightSectionLeft + SERVICE_BOX_PADDING
      });
    } else {
      // Format day range from all availability entries
      const dayRange = formatAvailabilityDayRange(availability);
      const times = availability[0]?.times || "";
      
      if (!dayRange || !times) {
        // Fallback if somehow data is invalid
        const availBoxTop = rightCurrentY;
        const availBoxPath = `M 0 0 H ${RIGHT_SECTION_WIDTH} V ${AVAILABILITY_BOX_HEIGHT} H 0 Z`;
        
        elements.push({
          type: "shape",
          paths: [{
            d: availBoxPath,
            fill: { color: getLightTint(primaryColor), dropTarget: false }
          }],
          viewBox: { width: RIGHT_SECTION_WIDTH, height: AVAILABILITY_BOX_HEIGHT, top: 0, left: 0 },
          width: RIGHT_SECTION_WIDTH,
          height: AVAILABILITY_BOX_HEIGHT,
          top: availBoxTop,
          left: rightSectionLeft
        });
      } else {
        const availBoxTop = rightCurrentY;
        const availBoxPath = `M 0 0 H ${RIGHT_SECTION_WIDTH} V ${AVAILABILITY_BOX_HEIGHT} H 0 Z`;
        
        elements.push({
          type: "shape",
          paths: [{
            d: availBoxPath,
            fill: { color: getLightTint(primaryColor), dropTarget: false }
          }],
          viewBox: { width: RIGHT_SECTION_WIDTH, height: AVAILABILITY_BOX_HEIGHT, top: 0, left: 0 },
          width: RIGHT_SECTION_WIDTH,
          height: AVAILABILITY_BOX_HEIGHT,
          top: availBoxTop,
          left: rightSectionLeft
        });
        
        // Day range (e.g., "Mon - Fri")
        elements.push({
          type: "text",
          children: [dayRange],
          color: secondaryColor,
          fontWeight: "semibold",
          fontSize: 14,
          width: 180,
          height: 20,
          top: availBoxTop + SERVICE_BOX_PADDING,
          left: rightSectionLeft + SERVICE_BOX_PADDING
        });
        
        // Time range
        elements.push({
          type: "text",
          children: [times],
          color: secondaryColor,
          fontWeight: "normal",
          fontSize: 12,
          width: 180,
          height: 15,
          top: availBoxTop + SERVICE_BOX_PADDING + 20 + 5,
          left: rightSectionLeft + SERVICE_BOX_PADDING
        });
      }
    }
    
    rightCurrentY += AVAILABILITY_BOX_HEIGHT + RIGHT_SECTION_GAP;
    
    // Book Now button - using simple rectangle (Canva doesn't support Q commands)
    // For a fully rounded button, we'll use a simple rectangle shape
    const buttonTop = rightCurrentY;
    const buttonLeft = rightSectionLeft;
    const buttonPath = `M 0 0 H ${BUTTON_WIDTH} V ${BUTTON_HEIGHT} H 0 L 0 0 Z`;
    
    elements.push({
      type: "shape",
      paths: [{
        d: buttonPath,
        fill: { color: primaryColor, dropTarget: false }
      }],
      viewBox: { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, top: 0, left: 0 },
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      top: buttonTop,
      left: buttonLeft
    });
    
    // Book Now button text
    elements.push({
      type: "text",
      children: ["Book Now"],
      color: "#FFFFFF",
      fontWeight: "medium",
      fontSize: 14,
      textAlign: "center",
      width: BUTTON_WIDTH,
      height: 20,
      top: buttonTop + (BUTTON_HEIGHT - 20) / 2,
      left: buttonLeft
    });

    return { 
      elements, 
      buttonTop, 
      buttonLeft, 
      cardWidth: CARD_WIDTH, 
      buttonWidth: BUTTON_WIDTH, 
      cardHeight: CARD_HEIGHT 
    };
  };

  const handleBack = () => {
    if (onboardingStep === 'step4') {
      setOnboardingStep('design');
    } else if (onboardingStep === 'step3') {
      setOnboardingStep('services');
    } else if (onboardingStep === 'design') {
      setOnboardingStep('step3');
    } else if (onboardingStep === 'services') {
      setOnboardingStep('step2');
    } else {
      setAuthState('connect');
    }
  };

  const handleStep2Next = async () => {
    // Temporarily skip saving business name/timezone from Canva.
    // Backend endpoints remain available; just move to the next step.
    setError('');
    setOnboardingStep('services');
  };

  const handleStep3Next = async () => {
    // Temporarily skip saving weekly availability from Canva.
    // Backend endpoint remains available; just move to the next step.
    setError('');
    setOnboardingStep('design');
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

  // Services helpers
  const handleServiceChange = (id: string, field: 'name' | 'duration' | 'price', value: string) => {
    setServices(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleAddServiceCard = () => {
    const nextId = `svc-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setServices(prev => [...prev, { id: nextId, name: '', duration: '', price: '' }]);
  };

  const handleDeleteServiceCard = (id: string) => {
    setServices(prev => (prev.length === 1 ? prev : prev.filter(s => s.id !== id)));
  };

  const handleServicesNext = async () => {
    try {
      setError('');
      const token = await auth.getCanvaUserToken();
      const backendHost = BACKEND_HOST || 'http://localhost:3000';

      const validServices = services.filter(
        (s) => s.name.trim() && s.duration.trim()
      );

      for (const svc of validServices) {
        const durationNumber = parseInt(svc.duration, 10);
        const priceNumber = svc.price ? Number(svc.price) : 0;

        const serviceResponse = await fetch(`${backendHost}/api/canva/appointment-types`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: svc.name.trim(),
            description: '',
            duration: Number.isFinite(durationNumber) ? durationNumber : 0,
            bufferTime: 0,
            price: Number.isFinite(priceNumber) ? priceNumber : 0,
            color: '#F19B11',
            isActive: true,
          })
        });

        if (!serviceResponse.ok) {
          const errorData = await serviceResponse.json();
          throw new Error(errorData.message || 'Failed to save appointment type');
        }
      }

      setOnboardingStep('step3');
    } catch (err: any) {
      console.error('Error saving services:', err);
      setError(err.message || 'Failed to save services');
    }
  };

  const handleLogoChange = (files: string[]) => {
    setLogoError('');
    setLogoName(files[0] || '');
  };

  const handleDesignNext = async () => {
    // Currently just advances; integrate backend save if needed
    setOnboardingStep('step4');
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
              Easily add a booking section to your Canva website
            </Title>
            <Text size="medium">
              Let customers schedule appointments with your small business through your Daywise booking page. Set up your services and availability, then add a booking section to your Canva website that links directly to your booking page.
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

  const renderRefreshBanner = () => {
    if (!hasDataChanges) return null;

    return (
      <Box
        padding="2u"
        borderRadius="standard"
        style={{
          backgroundColor: '#FFF4E5',
          border: '1px solid #FFB020',
          marginBottom: '16px'
        }}
      >
        <Rows spacing="2u">
          <Text size="small" weight="medium">
            Your services or availability have changed
          </Text>
          <Text size="small">
            Update your booking section to show the latest information
          </Text>
          <Button
            variant="primary"
            onClick={async () => {
              await handleAddEmbedToPage();
              setHasDataChanges(false);
            }}
            stretch
          >
            Add Updated Booking Page
          </Button>
        </Rows>
      </Box>
    );
  };

  // Step 4: Completion Screen
  if (onboardingStep === 'step4') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
          {renderTabs()}

          {activeTab === 'setup' ? (
            <>
              <Title size="medium">You&apos;re all set!</Title>
              <Text size="small">
                Your booking section is ready. Add it to your page so clients can book appointments
                through your Daywise booking page.
              </Text>

              {renderRefreshBanner()}

              <Box paddingTop="2u" width="full">
                <Button variant="primary" onClick={handleAddEmbedToPage} stretch>
                  Add Booking Page to Design
                </Button>
              </Box>

              {error && (
                <Box paddingStart="4u" paddingEnd="4u">
                  <Text tone="critical" alignment="center">
                    {error}
                  </Text>
                </Box>
              )}
            </>
          ) : manageContent}

          {renderPlanBanner()}

          <Box paddingTop="4u" paddingBottom="2u" width="full">
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
          {renderTabs()}

          {activeTab === 'setup' ? (
            <>
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
            </>
          ) : manageContent}

          {renderPlanBanner()}

          <Box paddingTop="4u" paddingBottom="2u">
            <Button variant="secondary" onClick={handleDisconnect} stretch>
              Disconnect
            </Button>
          </Box>
        </Rows>
      </div>
    );
  }

  // Step 4: Design (colors & logo)
  if (onboardingStep === 'design') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
          {renderTabs()}

          {activeTab === 'setup' ? (
            <>
              <Title size="medium">Design</Title>
              <Rows spacing="3u">
                {renderColorSwatch('Main Color', mainColor, setMainColor, mainColorInputRef)}
                {renderColorSwatch('Secondary Color', secondaryColor, setSecondaryColor, secondaryColorInputRef)}
                {renderColorSwatch('Text Color', textColor, setTextColor, textColorInputRef)}

                <Box>
                  <Title size="small">Logo Upload</Title>
                  <FileInput
                    accept={logoAcceptTypes}
                    onChange={handleLogoChange}
                    stretch
                  />
                  <Text size="small" tone="tertiary">Maximum file size: 5MB. JPG, PNG, or GIF.</Text>
                  {logoName && (
                    <Text size="small">Selected: {logoName}</Text>
                  )}
                  {logoError && (
                    <Text size="small" tone="critical">{logoError}</Text>
                  )}
                </Box>
              </Rows>

              <Box paddingTop="2u">
                <Columns spacing="2u">
                  <Column>
                    <Button variant="secondary" onClick={handleBack} stretch>
                      Back
                    </Button>
                  </Column>
                  <Column>
                    <Button variant="primary" onClick={handleDesignNext} stretch>
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
            </>
          ) : manageContent}

          {renderPlanBanner()}

          <Box paddingTop="4u" paddingBottom="2u" width="full">
            <Button variant="secondary" onClick={handleDisconnect} stretch>
              Disconnect
            </Button>
          </Box>
        </Rows>
      </div>
    );
  }

  // Step 2: Business Details
  if (onboardingStep === 'services') {
    return (
      <div className={styles.scrollContainer}>
        <Rows spacing="3u">
          {renderTabs()}

          {activeTab === 'setup' ? (
            <>
              <Title size="medium">Add your appointment/service types</Title>

              {services.map((svc, idx) => (
                <Box
                  key={svc.id}
                  padding="2u"
                  borderRadius="standard"
                  border
                  style={{
                    backgroundColor: '#eef1f6',
                    borderColor: '#cbd4e2',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)'
                  }}
                >
                  <Rows spacing="2u">
                    <FormField
                      label="Enter your appointment/service name"
                      value={svc.name}
                      control={(props) => (
                        <TextInput
                          {...props}
                          placeholder="Enter your appointment/service name"
                          onChange={(value) => handleServiceChange(svc.id, 'name', value)}
                        />
                      )}
                    />
                    <Columns spacing="2u">
                      <Column>
                        <FormField
                          label="Duration (mins)"
                          value={svc.duration}
                          control={(props) => (
                            <Select
                              {...props}
                              placeholder="Duration (mins)"
                              options={durationOptions}
                              value={svc.duration}
                              onChange={(value) => handleServiceChange(svc.id, 'duration', value)}
                            />
                          )}
                        />
                      </Column>
                      <Column>
                        <FormField
                          label="Price ($)"
                          value={svc.price}
                          control={(props) => (
                            <TextInput
                              {...props}
                              placeholder="Price ($)"
                              onChange={(value) => handleServiceChange(svc.id, 'price', value)}
                            />
                          )}
                        />
                      </Column>
                    </Columns>
                    <Box display="flex" justifyContent="flex-end">
                      <Button
                        variant="tertiary"
                        icon={TrashIcon}
                        aria-label="Delete service"
                        onClick={() => handleDeleteServiceCard(svc.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Rows>
                </Box>
              ))}

              <Box paddingTop="1u">
                <Button variant="secondary" onClick={handleAddServiceCard} stretch>
                  Add another
                </Button>
              </Box>

              <Box paddingTop="2u">
                <Columns spacing="2u">
                  <Column>
                    <Button variant="secondary" onClick={handleBack} stretch>
                      Back
                    </Button>
                  </Column>
                  <Column>
                    <Button variant="primary" onClick={handleServicesNext} stretch>
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
            </>
          ) : manageContent}

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
        {renderTabs()}

        {activeTab === 'setup' ? (
          <>
            <Title size="medium">Add your business details</Title>
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
          </>
        ) : manageContent}

          {renderPlanBanner()}

        <Box paddingTop="4u" paddingBottom="2u">
          <Button variant="secondary" onClick={handleDisconnect} stretch>
            Disconnect
          </Button>
        </Box>
      </Rows>
    </div>
  );
};
