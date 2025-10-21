import "./googlebutton.css";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const GoogleButton = ({ text, style = {} }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popupWindow, setPopupWindow] = useState(null);
  const [popupCheckInterval, setPopupCheckInterval] = useState(null);

  // Check calendar connection status on component mount
  useEffect(() => {
    checkCalendarStatus();

    // Listen for messages from OAuth popup
    const handleMessage = (event) => {
      console.log('Received message from popup:', event.data, 'Origin:', event.origin);
      console.log('Current state - isConnected:', isConnected, 'isLoading:', isLoading);
      
      if (event.data && event.data.type === 'CALENDAR_CONNECTED') {
        console.log('Calendar connected successfully - calling handleAuthSuccess');
        handleAuthSuccess();
      } else if (event.data && event.data.type === 'CALENDAR_ERROR') {
        console.log('Calendar connection failed:', event.data.error);
        handleAuthError(event.data.error || 'Authentication failed');
      } else {
        console.log('Unknown message type:', event.data?.type);
      }
    };

    // Add a small delay to ensure the listener is ready
    const timeoutId = setTimeout(() => {
      window.addEventListener('message', handleMessage);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      cleanup();
    };
  }, []);

  // Force re-render when component mounts if already connected
  useEffect(() => {
    const timer = setTimeout(() => {
      checkCalendarStatus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cleanup function
  const cleanup = () => {
    if (popupCheckInterval) {
      clearInterval(popupCheckInterval);
      setPopupCheckInterval(null);
    }
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
      setPopupWindow(null);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    console.log('handleAuthSuccess called - setting isConnected to true');
    setIsConnected(true);
    setIsLoading(false);
    cleanup();
    toast.success('Google Calendar connected successfully!');
  };

  // Handle authentication error
  const handleAuthError = (error) => {
    setIsLoading(false);
    cleanup();
    toast.error('Failed to connect Google Calendar. Please try again.');
  };

  const checkCalendarStatus = async (showSuccessToast = false) => {
    try {
      console.log('checkCalendarStatus called, showSuccessToast:', showSuccessToast);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/google-calendar/status`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Calendar status response:', data);
        const wasConnected = isConnected;
        
        // Force state update with a callback to ensure it's applied
        setIsConnected(prevConnected => {
          console.log('Previous connected state:', prevConnected, 'New state:', data.isConnected);
          return data.isConnected;
        });

        // Show success toast if connection status changed from false to true
        if (!wasConnected && data.isConnected && showSuccessToast) {
          console.log('Showing success toast for calendar connection');
          toast.success('Google Calendar connected successfully!');
        }
      } else {
        console.log('Failed to check calendar status:', response.status);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const openCalendarAuthPopup = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const authUrl = `${apiUrl}/api/google-calendar/auth`;

    // Clean up any existing popup
    cleanup();

    // Open popup window
    const popup = window.open(
      authUrl,
      'Google Calendar Authorization',
      'width=500,height=600,left=100,top=100,scrollbars=yes,resizable=yes'
    );

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast.error('Popup was blocked. Please allow popups for this site.');
      setIsLoading(false);
      return;
    }

    // Store popup reference
    setPopupWindow(popup);

    // Monitor popup state
    const checkInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkInterval);
        setPopupCheckInterval(null);
        setIsLoading(false);
        setPopupWindow(null);
        console.log('Popup was closed by user');
        
        // Fallback: Check calendar status after popup closes
        // This handles cases where the message doesn't come through
        setTimeout(() => {
          console.log('Fallback: Checking calendar status after popup closed');
          checkCalendarStatus(true);
        }, 1000);
        
        // Additional fallback: Force check after longer delay
        setTimeout(() => {
          console.log('Additional fallback: Force checking calendar status');
          checkCalendarStatus(true);
        }, 3000);
      }
    }, 1000);

    setPopupCheckInterval(checkInterval);

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        setIsLoading(false);
        cleanup();
        toast.error('Authentication timed out. Please try again.');
      }
    }, 300000); // 5 minutes timeout

    // Store timeout reference for cleanup
    popup._timeout = timeout;
  };

  const handleGoogleCalendarAuth = async () => {
    if (isConnected) {
      // If already connected, sync existing bookings
      await syncBookings();
      return;
    }

    // Not connected - open OAuth popup to connect
    setIsLoading(true);
    openCalendarAuthPopup();
  };

  const syncBookings = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/google-calendar/sync`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully synced ${data.syncedCount} bookings to Google Calendar!`);
      } else {
        throw new Error(data.message || 'Failed to sync bookings');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync bookings to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectCalendar = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/google-calendar/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setIsConnected(false);
        toast.success('Google Calendar disconnected successfully!');
      } else {
        throw new Error('Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="google-btn" 
        style={style}
        onClick={handleGoogleCalendarAuth}
        disabled={isLoading}
      >
        <img
          src="/assets/images/google-logo.png"
          alt="google"
          width={18}
          height={18}
        />
        {(() => {
          const buttonText = isLoading ? 'Connecting...' : isConnected ? 'Sync Calendar' : text;
          console.log('Rendering button with text:', buttonText, 'isConnected:', isConnected, 'isLoading:', isLoading);
          return buttonText;
        })()}
      </button>
      
      {isConnected && (
        <button
          onClick={disconnectCalendar}
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Disconnect Google Calendar"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default GoogleButton;
