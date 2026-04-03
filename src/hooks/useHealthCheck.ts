import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface HealthStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  error: string | null;
}

export const useHealthCheck = (intervalMs: number = 30000) => {
  const [status, setStatus] = useState<HealthStatus>({
    isOnline: false,
    isChecking: true,
    lastCheck: null,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = async () => {
    try {
      setStatus(prev => ({ ...prev, isChecking: true, error: null }));
      
      const response = await apiClient.healthCheck();
      
      setStatus({
        isOnline: response.success,
        isChecking: false,
        lastCheck: new Date(),
        error: null,
      });
    } catch (error) {
      setStatus({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  useEffect(() => {
    // Check immediately
    checkHealth();

    // Set up interval for periodic checks
    if (intervalMs > 0) {
      intervalRef.current = setInterval(checkHealth, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs]);

  const manualCheck = () => {
    checkHealth();
  };

  return {
    ...status,
    checkHealth: manualCheck,
  };
};