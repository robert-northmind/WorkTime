import React, { useEffect, useState } from 'react';
import { User as UserIcon, Lock, Info, Camera, Check, AlertCircle } from 'lucide-react';
import { subscribeToAuthChanges } from '../services/auth/AuthService';
import { updateProfile, updatePassword } from '../services/auth/ProfileService';
import { getUser } from '../services/firestore/FirestoreService';
import type { User } from 'firebase/auth';

const getInitials = (displayName: string | null, email: string | null): string => {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

type AlertState = { type: 'success' | 'error'; message: string } | null;

const Alert: React.FC<AlertState & { onDismiss: () => void }> = ({ type, message, onDismiss }) => (
  <div
    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
      type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    }`}
  >
    {type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
    <span className="flex-1">{message}</span>
    <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 ml-2">✕</button>
  </div>
);

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [profileAlert, setProfileAlert] = useState<AlertState>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordAlert, setPasswordAlert] = useState<AlertState>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName ?? '');
        setPhotoURL(u.photoURL ?? '');
        getUser(u.uid).then((doc) => {
          if (doc?.createdAt) {
            setMemberSince(new Date(doc.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            }));
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileAlert(null);
    try {
      await updateProfile(displayName.trim(), photoURL.trim() || null);
      setProfileAlert({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setProfileAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'New password must be at least 6 characters.' });
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
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      const friendly = msg.includes('wrong-password') || msg.includes('invalid-credential')
        ? 'Current password is incorrect.'
        : msg;
      setPasswordAlert({ type: 'error', message: friendly });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = getInitials(user?.displayName ?? null, user?.email ?? null);
  const isMockUser = user?.uid === 'mock-user-123' || user?.uid === 'agent-test-user';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Profile card */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
          <UserIcon className="h-5 w-5 text-blue-600" />
          Profile Info
        </h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile"
              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold select-none">
              {initials}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user?.displayName || 'No display name set'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {isMockUser && (
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
            <label htmlFor="photoURL" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              Photo URL
            </label>
            <input
              id="photoURL"
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Paste a publicly accessible image URL. Leave blank to use your initials.</p>
          </div>

          {profileAlert && (
            <Alert {...profileAlert} onDismiss={() => setProfileAlert(null)} />
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      {/* Password card */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
          <Lock className="h-5 w-5 text-blue-600" />
          Change Password
        </h2>

        {isMockUser && (
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
            disabled={savingPassword || isMockUser}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPassword ? 'Changing…' : 'Change password'}
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
          <div className="flex justify-between">
            <dt className="text-gray-500">User ID</dt>
            <dd className="text-gray-400 font-mono text-xs truncate max-w-[180px]">{user?.uid ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
