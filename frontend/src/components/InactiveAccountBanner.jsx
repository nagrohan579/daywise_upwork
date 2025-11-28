import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './InactiveAccountBanner.css';
import { LogoutIcon } from './SVGICONS/Svg';

const InactiveAccountBanner = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const apiUrl =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        navigate('/login');
      } else {
        toast.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  return (
    <div className="inactive-account-banner">
      <div className="inactive-account-warning-content">
        <div className="inactive-account-warning-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="inactive-account-warning-text">
          Your account is currently deactivated. Contact{' '}
          <a href="mailto:hello@daywisebooking.com" className="inactive-account-email-link">
            hello@daywisebooking.com
          </a>{' '}
          for more information.
        </p>
        <button
          className="inactive-account-mobile-logout"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
};

export default InactiveAccountBanner;
