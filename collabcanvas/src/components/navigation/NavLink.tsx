import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  children: ReactNode;
  onClick?: () => void;
}

/**
 * NavLink - Navigation link with active state and theme styling.
 * Used in both desktop and mobile navigation.
 */
export function NavLink({ to, children, onClick }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        font-body text-body-meta
        transition-colors duration-150
        hover:text-truecost-cyan focus-visible:text-truecost-cyan
        ${isActive ? 'text-truecost-cyan' : 'text-truecost-text-secondary'}
      `}
    >
      {children}
    </Link>
  );
}

