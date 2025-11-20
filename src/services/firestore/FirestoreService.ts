import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db, USE_MOCK } from '../firebase/config';
import type { FirestoreDailyEntry, UserDocument } from '../../types/firestore';

export const USERS_COLLECTION = 'users';
export const ENTRIES_COLLECTION = 'entries';

// --- Mock Helpers ---
const getMockData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setMockData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};
// --------------------

/**
 * Creates or updates a user document.
 */
export const saveUser = async (user: UserDocument): Promise<void> => {
  if (USE_MOCK) {
    const users = getMockData<UserDocument>('mock_users');
    const index = users.findIndex(u => u.uid === user.uid);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setMockData('mock_users', users);
    return;
  }

  if (!db) throw new Error('Firestore not initialized');
  await setDoc(doc(db, USERS_COLLECTION, user.uid), user);
};

/**
 * Fetches a user document.
 */
export const getUser = async (uid: string): Promise<UserDocument | null> => {
  if (USE_MOCK) {
    const users = getMockData<UserDocument>('mock_users');
    return users.find(u => u.uid === uid) || null;
  }

  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserDocument;
  }
  return null;
};

/**
 * Saves a daily entry.
 */
export const saveEntry = async (uid: string, entry: FirestoreDailyEntry): Promise<void> => {
  if (USE_MOCK) {
    const entries = getMockData<FirestoreDailyEntry>('mock_entries');
    // Composite key for uniqueness in mock: uid + date
    const index = entries.findIndex(e => e.uid === uid && e.date === entry.date);
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    setMockData('mock_entries', entries);
    return;
  }

  if (!db) throw new Error('Firestore not initialized');
  // Use date as ID for easy lookup: YYYY-MM-DD
  const entryId = `${uid}_${entry.date}`;
  await setDoc(doc(db, ENTRIES_COLLECTION, entryId), {
    ...entry,
    uid,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Fetches entries for a specific date range.
 */
export const getEntries = async (uid: string, startDate: string, endDate: string): Promise<FirestoreDailyEntry[]> => {
  if (USE_MOCK) {
    const entries = getMockData<FirestoreDailyEntry>('mock_entries');
    return entries.filter(e => 
      e.uid === uid && 
      e.date >= startDate && 
      e.date <= endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }

  if (!db) throw new Error('Firestore not initialized');
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('uid', '==', uid),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as FirestoreDailyEntry);
};
