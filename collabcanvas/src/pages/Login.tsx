import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginProps {
  onAuthenticated?: () => void;
}

/**
 * Login page
 * Displays when user is not authenticated
 * Provides Google Sign-In option
 */
export function Login({ onAuthenticated }: LoginProps) {
  const { user, loading, error, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user && onAuthenticated) {
      onAuthenticated();
    }
  }, [user, onAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            CollabCanvas
          </h1>
          <p className="text-gray-600">
            Real-time collaborative canvas for teams
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">Features:</h2>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Real-time collaboration</li>
              <li>• Live cursors and presence</li>
              <li>• Shape creation and movement</li>
              <li>• Automatic conflict resolution</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span>Loading...</span>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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

          {error && (
            <div className="w-full rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500">
            By signing in, you agree to use this app responsibly
          </p>
        </div>
      </div>
    </div>
  );
}

