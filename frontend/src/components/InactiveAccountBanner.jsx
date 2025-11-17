import React from 'react';
import './InactiveAccountBanner.css';

const InactiveAccountBanner = () => {
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
      </div>
    </div>
  );
};

export default InactiveAccountBanner;
