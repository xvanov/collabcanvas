import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import logo from '../../assets/logo.png';

/**
 * AuthenticatedNavbar - Glassmorphic nav for authenticated pages.
 * Compact height, logout support, mobile menu, user initial pill.
 */
export function AuthenticatedNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        border-b border-truecost-glass-border/70 shadow-lg
        ${
          scrolled
            ? 'bg-truecost-bg-primary/95 backdrop-blur-md'
            : 'bg-truecost-bg-primary/92 backdrop-blur-md'
        }
      `}
    >
      <nav className="container-spacious">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="TrueCost" className="w-8 h-8 object-contain drop-shadow-sm" />
            <span className="font-heading text-lg font-bold text-truecost-text-primary">
              TrueCost
            </span>
          </Link>

          {/* User Menu (contains Account + Logout) */}
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}

