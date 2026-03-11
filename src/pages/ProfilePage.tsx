import React, { useEffect, useState } from 'react';
import { User as UserIcon, Lock, Info, ExternalLink } from 'lucide-react';
import { subscribeToAuthChanges, isMockSession } from '../services/auth/AuthService';
import {
  updateProfile,
  updatePassword,
  validatePasswordChange,
  mapPasswordChangeError,
} from '../services/auth/ProfileService';
import { getUser } from '../services/firestore/FirestoreService';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Alert } from '../components/Alert';
import type { User } from 'firebase/auth';

type AlertState = { type: 'success' | 'error'; message: string } | null;

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [profileAlert, setProfileAlert] = useState<AlertState>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordAlert, setPasswordAlert] = useState<AlertState>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    return subscribeToAuthChanges((u) => {
      setUser(u);
      setIsMock(isMockSession());
      if (u) {
        setDisplayName(u.displayName ?? '');
        getUser(u.uid).then((doc) => {
          if (doc?.createdAt) {
            setMemberSince(
              new Date(doc.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            );
          }
        });
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileAlert(null);
    try {
      await updateProfile(displayName.trim());
      setProfileAlert({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setProfileAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);

    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      setPasswordAlert({ type: 'error', message: validationError });
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordAlert({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordAlert({ type: 'error', message: mapPasswordChangeError(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Profile card */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
          <UserIcon className="h-5 w-5 text-blue-600" />
          Profile Info
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <ProfileAvatar
            displayName={user?.displayName}
            email={user?.email}
            size="lg"
          />
          <div>
            <p className="font-medium text-gray-900">{user?.displayName || 'No display name set'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {isMock && import.meta.env.DEV && (
          <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Profile changes are not saved in demo/test mode.
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar
            </label>
            <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
              <ProfileAvatar
                displayName={user?.displayName}
                email={user?.email}
                size="sm"
              />
              <p className="text-sm text-gray-600 flex-1">
                Your avatar is powered by{' '}
                <a
                  href="https://gravatar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Gravatar
                </a>
                , linked to your email address.
              </p>
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors"
              >
                Change
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Sign up or update your avatar at gravatar.com. Changes appear everywhere automatically.
            </p>
          </div>

          {profileAlert && (
            <Alert {...profileAlert} onDismiss={() => setProfileAlert(null)} />
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      {/* Password card */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
          <Lock className="h-5 w-5 text-blue-600" />
          Change Password
        </h2>

        {isMock && import.meta.env.DEV && (
          <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Password changes are not available in demo/test mode.
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {passwordAlert && (
            <Alert {...passwordAlert} onDismiss={() => setPasswordAlert(null)} />
          )}

          <button
            type="submit"
            disabled={savingPassword || isMock}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPassword ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </section>

      {/* Account info card */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Info className="h-5 w-5 text-blue-600" />
          Account Info
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium">{user?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-gray-900 font-medium">{memberSince ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
