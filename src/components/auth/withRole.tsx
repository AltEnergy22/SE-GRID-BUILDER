'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have an auth hook
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface WithRoleOptions {
  redirectTo?: string;
  fallback?: React.ComponentType;
}

export function withRole(requiredRole: string | string[], options: WithRoleOptions = {}) {
  return function <P extends object>(WrappedComponent: React.ComponentType<P>) {
    const WithRoleComponent: React.FC<P> = (props) => {
      const router = useRouter();
      const { user, isLoading, isAuthenticated } = useAuth();
      const { redirectTo = '/unauthorized', fallback: FallbackComponent } = options;

      // Show loading while auth is being determined
      if (isLoading) {
        return <LoadingSpinner />;
      }

      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        router.replace('/login');
        return <LoadingSpinner />;
      }

      // Check if user has required role(s)
      const userRoles = user?.roles || [];
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      // If user doesn't have required role, show fallback or redirect
      if (!hasRequiredRole) {
        if (FallbackComponent) {
          return <FallbackComponent />;
        }
        router.replace(redirectTo);
        return <LoadingSpinner />;
      }

      // User has required role, render the component
      return <WrappedComponent {...props} />;
    };

    WithRoleComponent.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithRoleComponent;
  };
}

// Convenience wrapper for single role
export const withOperatorRole = (Component: React.ComponentType, options?: WithRoleOptions) =>
  withRole("OPERATOR", options)(Component);

export const withAdminRole = (Component: React.ComponentType, options?: WithRoleOptions) =>
  withRole("ADMIN", options)(Component);

export const withEngineerRole = (Component: React.ComponentType, options?: WithRoleOptions) =>
  withRole("ENGINEER", options)(Component); 