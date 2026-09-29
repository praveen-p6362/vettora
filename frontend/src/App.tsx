import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ui';
import AppShell from './components/AppShell';

import Splash from './pages/Splash';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import CandidateDashboard from './pages/candidate/Dashboard';
import Resume from './pages/candidate/Resume';
import Jobs from './pages/candidate/Jobs';
import Interview from './pages/candidate/Interview';
import Reports from './pages/candidate/Reports';
import Assessment from './pages/candidate/Assessment';

import HRDashboard from './pages/hr/Dashboard';
import HRJobs from './pages/hr/Jobs';
import HRCandidates from './pages/hr/Candidates';
import CandidateProfile from './pages/hr/CandidateProfile';

export default function App() {
  const { user, loading } = useAuth();

  /*
   * Authentication is still loading.
   * Show Vettora splash screen.
   */
  if (loading) {
    return <Splash />;
  }

  return (
    <Routes>

      {/* Vettora splash */}
      <Route
        path="/splash"
        element={<Splash />}
      />

      {/* Public pages */}

      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/" replace />
            : <Login />
        }
      />

      <Route
        path="/register"
        element={
          user
            ? <Navigate to="/" replace />
            : <Register />
        }
      />

      <Route
        path="/forgot-password"
        element={
          user
            ? <Navigate to="/" replace />
            : <ForgotPassword />
        }
      />

      {/* Protected application */}

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >

        {user?.role === 'hr' ? (
          <>
            <Route
              path="/"
              element={<HRDashboard />}
            />

            <Route
              path="/hr/jobs"
              element={<HRJobs />}
            />

            <Route
              path="/hr/candidates"
              element={<HRCandidates />}
            />

            <Route
              path="/hr/candidates/:id"
              element={<CandidateProfile />}
            />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={<CandidateDashboard />}
            />

            <Route
              path="/resume"
              element={<Resume />}
            />

            <Route
              path="/jobs"
              element={<Jobs />}
            />

            <Route
              path="/assessment/:applicationId"
              element={<Assessment />}
            />

            <Route
              path="/interview"
              element={<Interview />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />
          </>
        )}

      </Route>

      {/* Anything unknown goes to splash */}
      <Route
        path="*"
        element={<Navigate to="/splash" replace />}
      />

    </Routes>
  );
}