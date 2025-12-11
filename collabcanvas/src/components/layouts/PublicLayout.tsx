import type { ReactNode } from 'react';
import { PublicNavbar } from '../navigation/PublicNavbar';
import { Footer } from '../landing/Footer';

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Wrapper for public pages (landing, login, signup).
 * Applies dark theme background and includes the public navbar + footer.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-truecost-bg-primary text-truecost-text-primary flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

