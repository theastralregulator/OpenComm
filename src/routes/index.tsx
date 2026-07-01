/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Pages
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ProfileSetupPage } from '../pages/ProfileSetupPage';
import { FeedPage } from '../pages/FeedPage';
import { ProfilePage } from '../pages/ProfilePage';
import { EditProfilePage } from '../pages/EditProfilePage';
import { RoomsPage } from '../pages/RoomsPage';
import { RoomPage } from '../pages/RoomPage';
import { MessagesPage } from '../pages/MessagesPage';
import { ExplorePage } from '../pages/ExplorePage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AdminPage } from '../pages/AdminPage';
import { ErrorPage } from '../pages/ErrorPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner fullPage={true} />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to Profile Setup if registration was done but profile onboarding is incomplete
  if (!user.isSetupCompleted && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // Redirect away from Profile Setup if already completed
  if (user.isSetupCompleted && location.pathname === '/profile-setup') {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};

// Public Only Route Guard (e.g. login, register, forgot-password shouldn't be accessible by logged-in users)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner fullPage={true} />;
  }

  if (user) {
    // If user is authenticated but hasn't completed onboarding, push them to setup
    if (!user.isSetupCompleted) {
      return <Navigate to="/profile-setup" replace />;
    }
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Layout Routes */}
      <Route element={<PublicLayout />}>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Forms Guarded to Public-Only */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
      </Route>

      {/* Authenticated Dashboard Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:chatId" element={<MessagesPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Protected Admin Panel Routes (Dedicated Full-Screen Layout) */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/dashboard" element={<AdminPage />} />
        <Route path="/admin/users" element={<AdminPage />} />
        <Route path="/admin/posts" element={<AdminPage />} />
        <Route path="/admin/rooms" element={<AdminPage />} />
        <Route path="/admin/reports" element={<AdminPage />} />
        <Route path="/admin/announcements" element={<AdminPage />} />
        <Route path="/admin/analytics" element={<AdminPage />} />
        <Route path="/admin/settings" element={<AdminPage />} />
        <Route path="/admin/activity-logs" element={<AdminPage />} />
      </Route>

      {/* Global 404 Route */}
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};
