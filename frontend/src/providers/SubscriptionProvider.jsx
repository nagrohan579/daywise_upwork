/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const SubscriptionContext = createContext({});

export const SubscriptionProvider = ({ children }) => {
  const [isFreePlan, setIsFreePlan] = useState(null); // null = loading, true = free, false = pro
  const [isLoading, setIsLoading] = useState(true);
  const [planId, setPlanId] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/user-subscriptions/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const fetchedPlanId = data.subscription?.planId || "free";
        setPlanId(fetchedPlanId);
        setIsFreePlan(fetchedPlanId === "free");
        setSubscription(data.subscription || null);
      } else {
        // On error, default to free (show button)
        setPlanId("free");
        setIsFreePlan(true);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // On error, default to free (show button)
      setPlanId("free");
      setIsFreePlan(true);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch subscription once on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  const value = {
    isFreePlan,
    isLoading,
    planId,
    subscription,
    refreshSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

