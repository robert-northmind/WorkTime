import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db, USE_MOCK } from "../firebase/config";
import { withTrace } from "../faro/FaroService";
import type { FirestoreDailyEntry, UserDocument } from "../../types/firestore";

const TRACER_NAME = "firestore";

export const USERS_COLLECTION = "users";
export const ENTRIES_COLLECTION = "entries";

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
    const users = getMockData<UserDocument>("mock_users");
    const index = users.findIndex((u) => u.uid === user.uid);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setMockData("mock_users", users);
    return;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  await withTrace(
    TRACER_NAME,
    "saveUser",
    { collection: USERS_COLLECTION },
    async () => {
      await setDoc(doc(firestore, USERS_COLLECTION, user.uid), user);
    }
  );
};

/**
 * Fetches a user document.
 */
export const getUser = async (uid: string): Promise<UserDocument | null> => {
  if (USE_MOCK) {
    const users = getMockData<UserDocument>("mock_users");
    return users.find((u) => u.uid === uid) || null;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  return withTrace(
    TRACER_NAME,
    "getUser",
    { collection: USERS_COLLECTION },
    async () => {
      const docRef = doc(firestore, USERS_COLLECTION, uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserDocument;
      }
      return null;
    }
  );
};

/**
 * Saves a daily entry.
 */
export const saveEntry = async (
  uid: string,
  entry: FirestoreDailyEntry
): Promise<void> => {
  if (USE_MOCK) {
    const entries = getMockData<FirestoreDailyEntry>("mock_entries");
    // Composite key for uniqueness in mock: uid + date
    const index = entries.findIndex(
      (e) => e.uid === uid && e.date === entry.date
    );
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    setMockData("mock_entries", entries);
    return;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  await withTrace(
    TRACER_NAME,
    "saveEntry",
    { collection: ENTRIES_COLLECTION, date: entry.date },
    async () => {
      // Use date as ID for easy lookup: YYYY-MM-DD
      const entryId = `${uid}_${entry.date}`;
      await setDoc(doc(firestore, ENTRIES_COLLECTION, entryId), {
        ...entry,
        uid,
        updatedAt: new Date().toISOString(),
      });
    }
  );
};

/**
 * Fetches entries for a specific date range.
 */
export const getEntries = async (
  uid: string,
  startDate: string,
  endDate: string
): Promise<FirestoreDailyEntry[]> => {
  if (USE_MOCK) {
    const entries = getMockData<FirestoreDailyEntry>("mock_entries");
    return entries
      .filter((e) => e.uid === uid && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  return withTrace(
    TRACER_NAME,
    "getEntries",
    { collection: ENTRIES_COLLECTION, startDate, endDate },
    async () => {
      const q = query(
        collection(firestore, ENTRIES_COLLECTION),
        where("uid", "==", uid),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data() as FirestoreDailyEntry);
    }
  );
};

/**
 * Deletes a daily entry.
 */
export const deleteEntry = async (uid: string, date: string): Promise<void> => {
  if (USE_MOCK) {
    const entries = getMockData<FirestoreDailyEntry>("mock_entries");
    const filtered = entries.filter((e) => !(e.uid === uid && e.date === date));
    setMockData("mock_entries", filtered);
    return;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  await withTrace(
    TRACER_NAME,
    "deleteEntry",
    { collection: ENTRIES_COLLECTION, date },
    async () => {
      const entryId = `${uid}_${date}`;
      await deleteDoc(doc(firestore, ENTRIES_COLLECTION, entryId));
    }
  );
};

/**
 * Batch saves daily entries.
 */
export const batchSaveEntries = async (
  uid: string,
  entries: FirestoreDailyEntry[]
): Promise<void> => {
  if (USE_MOCK) {
    const mockEntries = getMockData<FirestoreDailyEntry>("mock_entries");
    entries.forEach((entry) => {
      const index = mockEntries.findIndex(
        (e) => e.uid === uid && e.date === entry.date
      );
      if (index >= 0) {
        mockEntries[index] = entry;
      } else {
        mockEntries.push(entry);
      }
    });
    setMockData("mock_entries", mockEntries);
    return;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  await withTrace(
    TRACER_NAME,
    "batchSaveEntries",
    { collection: ENTRIES_COLLECTION, count: String(entries.length) },
    async () => {
      const batch = writeBatch(firestore);

      entries.forEach((entry) => {
        const entryId = `${uid}_${entry.date}`;
        const docRef = doc(firestore, ENTRIES_COLLECTION, entryId);
        batch.set(docRef, {
          ...entry,
          uid,
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
    }
  );
};

/**
 * Batch deletes daily entries.
 */
export const batchDeleteEntries = async (
  uid: string,
  entryIds: string[]
): Promise<void> => {
  if (USE_MOCK) {
    let mockEntries = getMockData<FirestoreDailyEntry>("mock_entries");
    // entryIds for mock are just dates in this context if we align with how we call it,
    // but let's assume the caller passes the full ID or we parse it.
    // Actually, for Firestore batch delete, we usually pass IDs.
    // Let's assume entryIds are the document IDs (uid_date).

    const datesToDelete = entryIds.map((id) => id.split("_")[1]);
    mockEntries = mockEntries.filter(
      (e) => !(e.uid === uid && datesToDelete.includes(e.date))
    );
    setMockData("mock_entries", mockEntries);
    return;
  }

  if (!db) throw new Error("Firestore not initialized");
  const firestore = db;

  await withTrace(
    TRACER_NAME,
    "batchDeleteEntries",
    { collection: ENTRIES_COLLECTION, count: String(entryIds.length) },
    async () => {
      const batch = writeBatch(firestore);

      entryIds.forEach((id) => {
        const docRef = doc(firestore, ENTRIES_COLLECTION, id);
        batch.delete(docRef);
      });

      await batch.commit();
    }
  );
};
