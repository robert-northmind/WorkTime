import {
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage, USE_MOCK } from '../firebase/config';
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

export const uploadProfilePhoto = async (
  uid: string,
  dataUrl: string,
  oldPhotoURL: string | null
): Promise<string> => {
  if (USE_MOCK || !storage) return dataUrl;

  if (oldPhotoURL) {
    try {
      const oldRef = ref(storage, oldPhotoURL);
      await deleteObject(oldRef);
    } catch {
      // Old photo may already be deleted or be an external URL — ignore
    }
  }

  const photoRef = ref(storage, `profilePhotos/${uid}/${Date.now()}.jpg`);
  await uploadString(photoRef, dataUrl, 'data_url');
  return getDownloadURL(photoRef);
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
