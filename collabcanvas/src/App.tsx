import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Public pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

// Authenticated pages
import { Dashboard } from './pages/Dashboard';
import { Project } from './pages/Project';
import { Account } from './pages/Account';
import { NewEstimate } from './pages/estimate/NewEstimate';
import { EstimateView } from './pages/estimate/EstimateView';
import { PlanView } from './pages/estimate/PlanView';
import { FinalView } from './pages/estimate/FinalView';
import { Board } from './pages/Board';
import { PriceComparisonPage } from './components/PriceComparisonPage';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * ScrollToTop - ensures each route change starts at the top of the page.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

/**
 * Main App component
 * Handles routing and authentication guards
 */
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Authenticated app routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        {/* Estimate routes (placeholders for now) */}
        <Route
          path="/estimate/new"
          element={
            <ProtectedRoute>
              <NewEstimate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimate/:id"
          element={
            <ProtectedRoute>
              <EstimateView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimate/:id/plan"
          element={
            <ProtectedRoute>
              <PlanView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimate/:id/canvas"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimate/:id/final"
          element={
            <ProtectedRoute>
              <FinalView />
            </ProtectedRoute>
          }
        />

        {/* Legacy route preserved during transition */}
        <Route
          path="/projects/:projectId/*"
          element={
            <ProtectedRoute>
              <Project />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare-prices"
          element={
            <ProtectedRoute>
              <PriceComparisonPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
