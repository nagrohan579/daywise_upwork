import { useState, useEffect } from 'react';

const apiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:3000';

/**
 * Custom hook to check if the user's account is active or inactive
 * @returns {Object} - { isInactive: boolean, isLoading: boolean, accountStatus: string }
 */
const useAccountStatus = () => {
  const [accountStatus, setAccountStatus] = useState('active');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccountStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const status = data.user?.accountStatus || 'active';
          setAccountStatus(status);
        } else {
          // If the request fails, default to active (let auth handle login redirect)
          setAccountStatus('active');
        }
      } catch (error) {
        console.error('Error fetching account status:', error);
        setAccountStatus('active');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountStatus();
  }, []);

  return {
    isInactive: accountStatus === 'inactive',
    isLoading,
    accountStatus,
  };
};

export default useAccountStatus;
