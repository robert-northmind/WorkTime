import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { auth, USE_MOCK } from '../firebase/config';

// Mock user for demo mode
const MOCK_USER: User = {
  uid: 'mock-user-123',
  email: 'demo@example.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({
    token: 'mock-token',
    signInProvider: 'password',
    claims: {},
    authTime: Date.now().toString(),
    issuedAtTime: Date.now().toString(),
    expirationTime: (Date.now() + 3600000).toString(),
    signInSecondFactor: null,
  }),
  reload: async () => {},
  toJSON: () => ({}),
  displayName: 'Demo User',
  phoneNumber: null,
  photoURL: null,
  providerId: 'password',
};

// Simple event emitter for mock auth
let mockUser: User | null = localStorage.getItem('mock_auth_user') ? MOCK_USER : null;
const mockListeners: ((user: User | null) => void)[] = [];

const notifyMockListeners = () => {
  mockListeners.forEach(listener => listener(mockUser));
};

export const login = async (email: string, password: string): Promise<void> => {
  if (USE_MOCK) {
    console.log('Mock Login with:', email, password);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    mockUser = MOCK_USER;
    localStorage.setItem('mock_auth_user', 'true');
    notifyMockListeners();
    return;
  }
  
  if (!auth) throw new Error('Firebase Auth not initialized');
  await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async (): Promise<void> => {
  if (USE_MOCK) {
    mockUser = null;
    localStorage.removeItem('mock_auth_user');
    notifyMockListeners();
    return;
  }

  if (!auth) throw new Error('Firebase Auth not initialized');
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void): () => void => {
  if (USE_MOCK) {
    mockListeners.push(callback);
    // Immediate callback
    callback(mockUser);
    return () => {
      const index = mockListeners.indexOf(callback);
      if (index > -1) mockListeners.splice(index, 1);
    };
  }

  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = (): User | null => {
  if (USE_MOCK) {
    return mockUser;
  }
  return auth?.currentUser || null;
};
