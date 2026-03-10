import {
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, USE_MOCK } from '../firebase/config';
import { getCurrentUser } from './AuthService';

export { getInitials, validatePasswordChange, mapPasswordChangeError } from './ProfileUtils';

export const updateProfile = async (
  displayName: string,
  photoURL: string | null
): Promise<void> => {
  if (USE_MOCK) return;

  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  if (!auth) throw new Error('Firebase Auth not initialized');

  await firebaseUpdateProfile(user, { displayName, photoURL });
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  if (USE_MOCK) return;

  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated');
  if (!auth) throw new Error('Firebase Auth not initialized');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await firebaseUpdatePassword(user, newPassword);
};
