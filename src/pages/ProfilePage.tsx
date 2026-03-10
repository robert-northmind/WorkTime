import React, { useEffect, useRef, useState } from 'react';
import { User as UserIcon, Lock, Info, Camera } from 'lucide-react';
import { subscribeToAuthChanges, isMockSession } from '../services/auth/AuthService';
import {
  updateProfile,
  updatePassword,
  validatePasswordChange,
  mapPasswordChangeError,
} from '../services/auth/ProfileService';
import { PhotoCropModal } from '../components/PhotoCropModal';
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
  const [photoURL, setPhotoURL] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrcUrl, setCropSrcUrl] = useState<string | null>(null);
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
        setPhotoURL(u.photoURL ?? '');
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
      await updateProfile(displayName.trim(), photoURL.trim() || null);
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

  const handlePhotoFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCropSrcUrl(URL.createObjectURL(file));
  };

  const handleCropConfirm = (dataUrl: string) => {
    if (cropSrcUrl) URL.revokeObjectURL(cropSrcUrl);
    setCropSrcUrl(null);
    setPhotoURL(dataUrl);
  };

  const handleCropCancel = () => {
    if (cropSrcUrl) URL.revokeObjectURL(cropSrcUrl);
    setCropSrcUrl(null);
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
            photoURL={user?.photoURL}
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
            <label
              htmlFor="photoURL"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              Photo
            </label>
            <div className="flex gap-2">
              <input
                id="photoURL"
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a photo from your device"
                className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Choose</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFilePick}
            />
            <p className="mt-1 text-xs text-gray-500">
              Paste an image URL or pick a photo from your device. Leave blank to use your initials.
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
        </dl>
      </section>
      {cropSrcUrl && (
        <PhotoCropModal
          srcUrl={cropSrcUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};
