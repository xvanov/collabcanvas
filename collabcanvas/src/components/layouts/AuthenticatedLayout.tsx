import type { ReactNode } from 'react';
import { AuthenticatedNavbar } from '../navigation/AuthenticatedNavbar';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

/**
 * Wrapper for authenticated pages (dashboard, estimates, account).
 * Applies dark theme background and includes the authenticated navbar.
 */
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-truecost-bg-primary text-truecost-text-primary">
      <AuthenticatedNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

