import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

/**
 * Footer - Site footer for public pages.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-truecost-bg-surface to-truecost-bg-primary border-t border-truecost-glass-border">
      <div className="container-spacious py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <img src={logo} alt="TrueCost" className="w-9 h-9 object-contain drop-shadow-sm" />
              <span className="font-heading text-xl font-bold text-truecost-text-primary">TrueCost</span>
            </Link>
            <p className="font-body text-body-meta text-truecost-text-secondary max-w-xs">
              Precise construction estimating for contractors who demand accuracy.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-heading text-body font-semibold text-truecost-text-primary">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#features" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/login" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-heading text-body font-semibold text-truecost-text-primary">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="font-body text-body-meta text-truecost-text-secondary hover:text-truecost-cyan transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-truecost-glass-border">
          <p className="font-body text-body-meta text-truecost-text-muted text-center">
            © {year} TrueCost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

