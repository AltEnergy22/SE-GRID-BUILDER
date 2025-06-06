import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Mock auth hook - replace with your actual authentication logic
export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      // Mock user data - in real app, this would come from your auth service
      const mockUser: User = {
        id: '1',
        email: 'operator@example.com',
        name: 'Grid Operator',
        roles: ['OPERATOR'], // Change this to test different roles
      };

      setAuthState({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return authState;
}; 