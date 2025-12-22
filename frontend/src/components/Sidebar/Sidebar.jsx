import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoMdClose } from "react-icons/io";
import { toast } from "sonner";

import {
  AvailabilityIcon,
  BellIcon,
  CalendarIcon,
  ServiceIcon,
  FormsIcon,
  BrandingIcon,
  LinkIcon,
  SettingIcon,
  AccountIcon,
  BiilingIcon,
  PaymentIcon,
  LogoutIcon,
  BoltIcon,
} from "../SVGICONS/Svg";
import NotificationsModal from "../ui/modals/NotificationsModal";
import UpgradeModal from "../ui/modals/UpgradeModal";
import InactiveAccountBanner from "../InactiveAccountBanner";
import useAccountStatus from "../../hooks/useAccountStatus";
import { formatDateTime, formatTimestamp } from "../../utils/dateFormatting";
import "./Sidebar.css";

// Mock Icons (replace with actual SVG or library icons like Lucide, Feather)
const Icon = ({ children }) => (
  <span style={{
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>{children}</span>
);

const navItems = [
  { name: "Bookings", path: "/booking", icon: <CalendarIcon /> },
  { name: "Services", path: "/service", icon: <ServiceIcon /> },
  { name: "Forms", path: "/forms", icon: <FormsIcon /> },
  { name: "Availability", path: "/availability", icon: <AvailabilityIcon /> },
  { name: "Branding", path: "/branding", icon: <BrandingIcon /> },
  { name: "My Link", path: "/my-link", icon: <LinkIcon /> },
  { name: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { name: "Settings", path: "/setting", icon: <SettingIcon /> },
  { name: "Account", path: "/account", icon: <AccountIcon /> },
  { name: "Billing", path: "/billing", icon: <BiilingIcon /> },
];

const Sidebar = ({ isOpen, toggleSidebar, accountStatus }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userTimezone, setUserTimezone] = useState('Etc/UTC'); // Default to UTC
  const [isFreePlan, setIsFreePlan] = useState(null); // null = loading, true = free, false = pro
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isInactive = accountStatus === 'inactive';
  const sidebarContainerRef = useRef(null);
  const logoutContainerRef = useRef(null);

  // Fetch user timezone and subscription status on mount
  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.timezone) {
            setUserTimezone(data.user.timezone);
          }
        }
      } catch (error) {
        console.error('Error fetching user timezone:', error);
      }
    };

    const fetchSubscription = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const planId = data.subscription?.planId || "free";
          setIsFreePlan(planId === "free");
        } else {
          // On error, default to free (show button)
          setIsFreePlan(true);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        // On error, default to free (show button)
        setIsFreePlan(true);
      }
    };

    fetchUserTimezone();
    fetchSubscription();
    fetchNotifications();
  }, []);

  // Listen for timezone changes from Account page
  useEffect(() => {
    const handleTimezoneChange = (event) => {
      console.log('Notifications - Timezone changed to:', event.detail.timezone);
      // Update local timezone state
      setUserTimezone(event.detail.timezone);
      // Refresh notifications when timezone changes (to update displayed times)
      fetchNotifications();
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange);

    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange);
    };
  }, []);

  // Fallback: Measure logout container position to detect if it's being covered by browser UI
  // This only runs for browsers where CSS env() and dvh don't work correctly
  useEffect(() => {
    const measureLogoutPosition = () => {
      // First check if we're on a mobile device
      const isMobile = window.innerWidth < 992;

      if (!isMobile || !sidebarContainerRef.current || !logoutContainerRef.current) {
        // Not on mobile or refs not ready, reset fallback padding
        if (sidebarContainerRef.current) {
          sidebarContainerRef.current.style.setProperty('--bottom-ui-bar-height', '0px');
        }
        return;
      }

      // Get the logout container's bounding rectangle
      const logoutRect = logoutContainerRef.current.getBoundingClientRect();

      // Get the viewport height (visible area)
      const viewportHeight = window.visualViewport?.height || window.innerHeight;

      // Calculate how far the logout container is from the bottom of the viewport
      const distanceFromBottom = viewportHeight - logoutRect.bottom;

      // If the logout container is too close to or below the viewport bottom (< 5px),
      // it's likely being covered by browser UI
      if (distanceFromBottom < 5) {
        // Calculate how much padding we need to push it above the browser UI
        // Add minimal padding just enough to clear the browser UI (reduced from 38px to 30px)
        const neededPadding = Math.max(30 - distanceFromBottom, 0);
        sidebarContainerRef.current.style.setProperty('--bottom-ui-bar-height', `${neededPadding}px`);
      } else {
        // Logout container is visible, no extra padding needed
        sidebarContainerRef.current.style.setProperty('--bottom-ui-bar-height', '0px');
      }
    };

    // Debounce function to avoid excessive calculations
    let debounceTimer;
    const debouncedMeasure = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(measureLogoutPosition, 150);
    };

    // Initial measurement after a short delay to ensure DOM is ready
    const initialTimer = setTimeout(measureLogoutPosition, 200);

    // Listen for resize and orientation change events
    window.addEventListener('resize', debouncedMeasure);
    window.addEventListener('orientationchange', debouncedMeasure);
    window.addEventListener('scroll', debouncedMeasure);

    // Also listen to visual viewport changes if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedMeasure);
      window.visualViewport.addEventListener('scroll', debouncedMeasure);
    }

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(debounceTimer);
      window.removeEventListener('resize', debouncedMeasure);
      window.removeEventListener('orientationchange', debouncedMeasure);
      window.removeEventListener('scroll', debouncedMeasure);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', debouncedMeasure);
        window.visualViewport.removeEventListener('scroll', debouncedMeasure);
      }
    };
  }, [isOpen]); // Re-run when sidebar opens/closes

  const fetchNotifications = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/notifications`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Calculate unread count
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);

        // Format notifications for display using user's timezone
        const formattedNotifications = data.map(notif => ({
          id: notif._id,
          type: notif.type, // 'scheduled', 'rescheduled', 'cancelled'
          customerName: notif.customerName,
          serviceName: notif.serviceName,
          dateTime: formatDateTime(notif.appointmentDate, userTimezone),
          timestamp: formatTimestamp(notif.createdAt, userTimezone),
          action: notif.type === 'scheduled' || notif.type === 'rescheduled',
          isRead: notif.isRead,
          relatedBookingId: notif.relatedBookingId,
          appointmentDate: notif.appointmentDate // Keep raw timestamp for navigation
        }));
        setNotifications(formattedNotifications);
      } else {
        console.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        toggleSidebar(); // Close sidebar
        navigate('/login'); // Redirect to login page
      } else {
        toast.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  const handleBellClick = async (e) => {
    e.preventDefault();

    // Close sidebar on mobile when opening notifications
    const isMobile = window.innerWidth < 992; // Using same breakpoint as CSS
    if (isMobile && isOpen) {
      toggleSidebar();
    }

    // Mark all notifications as read when opening modal
    if (unreadCount > 0) {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/notifications/mark-all-read`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          // Update local state - mark all notifications as read
          const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
          setNotifications(updatedNotifications);
          setUnreadCount(0);
        } else {
          console.error('Failed to mark notifications as read');
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }

    setShowNotifications(true);
  };

  const handleNotificationDelete = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Remove from local state
        setNotifications(notifications.filter(notif => notif.id !== id));
      } else {
        console.error('Failed to delete notification');
        toast.error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('An error occurred while deleting notification');
    }
  };

  const handleShowInCalendar = (notification) => {
    // Close notifications modal
    setShowNotifications(false);

    // Navigate to booking page with URL params
    const bookingId = notification.relatedBookingId;
    const appointmentDate = notification.appointmentDate;

    // Build URL with params
    const params = new URLSearchParams();
    if (bookingId) params.set('bookingId', bookingId);
    if (appointmentDate) params.set('date', appointmentDate);
    params.set('view', 'calendar');
    params.set('dayView', 'true');

    navigate(`/booking?${params.toString()}`);
  };

  return (
    <>
      <div ref={sidebarContainerRef} className={`sidebar-container ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <Link to={"/booking"}>
            <img src="/assets/images/logo.svg" alt="Daywise Logo" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? "is-active" : ""
                    } ${isInactive ? "disabled" : ""}`}
                  onClick={(e) => {
                    if (isInactive) {
                      e.preventDefault();
                      return;
                    }
                    toggleSidebar();
                  }}
                >
                  <Icon>{item.icon}</Icon>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={logoutContainerRef} className="logout-container">
          {isFreePlan === true && (
            <button
              className="upgrade-to-pro-button"
              onClick={(e) => {
                e.preventDefault();
                if (isInactive) {
                  return;
                }
                setShowUpgradeModal(true);
                toggleSidebar();
              }}
            >
              <BoltIcon />
              <span>Upgrade to Pro</span>
            </button>
          )}
          <Link
            to="/feedback"
            className={`leave-feedback-button ${isInactive ? "disabled" : ""}`}
            onClick={(e) => {
              if (isInactive) {
                e.preventDefault();
              }
            }}
          >
            Leave Feedback
          </Link>
          <div className="logout-wrapper">
            <button className="logout-link" onClick={handleLogout}>
              <Icon>
                <LogoutIcon />
              </Icon>
              Logout
            </button>
            <div
              className={`notification-bell ${isInactive ? "disabled" : ""}`}
              onClick={(e) => {
                if (isInactive) {
                  return;
                }
                handleBellClick(e);
              }}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        show={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onDelete={handleNotificationDelete}
        onShowInCalendar={handleShowInCalendar}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        show={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
};

const AppLayout = ({ children }) => {
  const { accountStatus, isInactive } = useAccountStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Disable body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isSidebarOpen]);

  // Close sidebar if window size changes from mobile to desktop
  useEffect(() => {
    const handleResize = () => {
      // Assuming 992px is the desktop breakpoint from CSS
      if (window.innerWidth >= 992) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app-layout">
      {/* Hamburger button visible only on mobile  */}
      <button
        className="hamburger-button"
      >
        {isSidebarOpen ? (
          <>
            <IoMdClose color="#121212" size={30} onClick={toggleSidebar} />
            <Link to={"/booking"}>
              <img
                src="/assets/images/logo.svg"
                alt="Daywise Logo"
                width={135}
              />
            </Link>
          </>
        ) : (
          <GiHamburgerMenu color="#121212" size={24} onClick={toggleSidebar} />
        )}
        {!isSidebarOpen && (
          <svg
            width="20"
            height="18"
            viewBox="0 0 24 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M23.4596 8.98324L19.476 2.08416C18.7555 0.836655 17.4246 0.0673828 15.9835 0.0673828H8.01645C6.57535 0.0673828 5.24451 0.836655 4.52396 2.08416L0.540413 8.98324C-0.180138 10.2307 -0.180138 11.768 0.540413 13.0168L4.52396 19.9159C5.24451 21.1634 6.57535 21.9327 8.01645 21.9327H15.9835C17.4246 21.9327 18.7555 21.1634 19.476 19.9159L23.4596 13.0168C24.1801 11.7693 24.1801 10.232 23.4596 8.98324ZM20.9774 12.2821C20.9697 12.3001 20.9646 12.318 20.9556 12.336C20.9428 12.3642 20.9261 12.3911 20.912 12.418C20.912 12.4206 20.9095 12.4232 20.9082 12.4245C20.8864 12.4668 20.8646 12.5104 20.8402 12.5527L19.2632 15.2849L17.767 17.8747C17.2118 18.8376 16.1848 19.43 15.0732 19.43H8.92932C7.81772 19.43 6.79075 18.8376 6.23559 17.8747L3.16363 12.5539C2.60847 11.5911 2.60847 10.4064 3.16363 9.44353L6.23559 4.12273C6.65613 3.3932 7.34847 2.87779 8.1421 2.6688C8.56264 2.52264 9.0101 2.44315 9.4691 2.44315H11.0653C11.582 2.44315 12.0013 2.8624 12.0013 3.3791V10.0654C12.0013 10.5808 12.4205 10.9987 12.9372 10.9987H14.3899H18.3273L20.1107 10.9975C20.7787 10.9975 21.2236 11.6731 20.9787 12.2809L20.9774 12.2821Z"
              fill="#0053F1"
            />
          </svg>
        )}
      </button>

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} accountStatus={accountStatus} />

      <main className="main-content-area">
        {isInactive && <InactiveAccountBanner />}
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
