import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Board } from './pages/Board';

/**
 * Main App component
 * Handles authentication guard - only authenticated users can access the board
 */
function App() {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Login page if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show Board if authenticated
  return <Board />;
}

export default App;
