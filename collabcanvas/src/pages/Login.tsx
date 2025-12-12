import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PublicLayout } from '../components/layouts/PublicLayout';

interface LoginProps {
  onAuthenticated?: () => void;
}

/**
 * Login Page - TrueCost dark glassmorphic redesign.
 * Preserves Google OAuth flow; email/password are UI-only placeholders.
 */
export function Login({ onAuthenticated }: LoginProps) {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (onAuthenticated) {
        onAuthenticated();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, onAuthenticated]);

  return (
    <PublicLayout>
      <div className="flex min-h-screen items-center justify-center pt-24 pb-24 md:pt-28">
        <div className="w-full max-w-md mx-4">
          <div className="glass-panel p-8 md:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-heading text-h2 text-truecost-text-primary">Welcome Back</h1>
              <p className="font-body text-body text-truecost-text-secondary">
                Sign in to continue to TrueCost
              </p>
            </div>

            {/* Email (placeholder) */}
            <div className="space-y-2">
              <label className="block font-body text-body-meta text-truecost-text-secondary">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                disabled
                className="glass-input w-full opacity-50 cursor-not-allowed"
                title="Email/password login coming soon - use Google Sign-In for now"
              />
            </div>

            {/* Password (placeholder) */}
            <div className="space-y-2">
              <label className="block font-body text-body-meta text-truecost-text-secondary">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                disabled
                className="glass-input w-full opacity-50 cursor-not-allowed"
                title="Email/password login coming soon - use Google Sign-In for now"
              />
            </div>

            {/* Remember me / Forgot password (placeholders) */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-not-allowed opacity-50">
                <input
                  type="checkbox"
                  disabled
                  className="w-4 h-4 rounded border-truecost-glass-border bg-truecost-glass-bg"
                />
                <span className="font-body text-body-meta text-truecost-text-secondary">Remember me</span>
              </label>
              <button
                disabled
                className="font-body text-body-meta text-truecost-cyan hover:underline cursor-not-allowed opacity-50"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary login (disabled placeholder) */}
            <button
              disabled
              className="w-full btn-pill-primary opacity-50 cursor-not-allowed"
              title="Email/password login coming soon - use Google Sign-In below"
            >
              Log In
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex-1 border-t border-truecost-glass-border/80" />
              <span className="px-3 rounded-full font-body text-body-meta text-truecost-text-muted bg-truecost-bg-primary/90">
                Or continue with
              </span>
              <div className="flex-1 border-t border-truecost-glass-border/80" />
            </div>

            {/* Google Sign-In (functional) */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full btn-pill-secondary flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-truecost-cyan border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            {/* Error display */}
            {error && (
              <div className="glass-panel bg-truecost-danger/10 border-truecost-danger/30 p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-truecost-danger flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="font-body text-body-meta text-truecost-danger">{error}</p>
                </div>
              </div>
            )}

            {/* Signup link */}
            <div className="text-center">
              <p className="font-body text-body-meta text-truecost-text-secondary">
                Don't have an account?{' '}
                <Link to="/signup" className="text-truecost-cyan hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center font-body text-body-meta text-truecost-text-muted">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

