import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { auth, USE_MOCK } from '../firebase/config';

const AGENT_TEST_AUTH_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_AGENT_TEST_AUTH_ENABLED === 'true';
const AGENT_TEST_EMAIL = import.meta.env.VITE_AGENT_TEST_EMAIL || 'agent-test@example.com';
const AGENT_TEST_PASSWORD = import.meta.env.VITE_AGENT_TEST_PASSWORD || '';
const MOCK_AUTH_STORAGE_KEY = 'mock_auth_user';

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

const AGENT_TEST_USER: User = {
  ...MOCK_USER,
  uid: 'agent-test-user',
  email: AGENT_TEST_EMAIL,
  displayName: 'Agent Test User',
};

type MockAuthType = 'mock' | 'agent';

// Simple event emitter for mock auth
const getStoredMockAuthType = (): MockAuthType | null => {
  const authType = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
  if (authType === 'agent' && !AGENT_TEST_AUTH_ENABLED) {
    localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
    return null;
  }
  if (authType === 'agent' || authType === 'mock') return authType;
  if (authType === 'true') return 'mock'; // legacy support
  return null;
};

const getUserByMockAuthType = (mockAuthType: MockAuthType | null): User | null => {
  if (mockAuthType === 'agent') return AGENT_TEST_USER;
  if (mockAuthType === 'mock') return MOCK_USER;
  return null;
};

let mockAuthType: MockAuthType | null = getStoredMockAuthType();
let mockUser: User | null = getUserByMockAuthType(mockAuthType);
const mockListeners: ((user: User | null) => void)[] = [];

const isAgentSessionActive = (): boolean => AGENT_TEST_AUTH_ENABLED && mockAuthType === 'agent';

const notifyMockListeners = () => {
  mockListeners.forEach(listener => listener(mockUser));
};

const setMockSession = (type: MockAuthType): void => {
  mockAuthType = type;
  mockUser = getUserByMockAuthType(type);
  localStorage.setItem(MOCK_AUTH_STORAGE_KEY, type);
};

const clearMockSession = (): void => {
  mockAuthType = null;
  mockUser = null;
  localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
};

export const login = async (email: string, password: string): Promise<void> => {
  if (
    AGENT_TEST_AUTH_ENABLED &&
    email === AGENT_TEST_EMAIL &&
    password === AGENT_TEST_PASSWORD
  ) {
    await new Promise(resolve => setTimeout(resolve, 200));
    setMockSession('agent');
    notifyMockListeners();
    return;
  }

  if (USE_MOCK) {
    console.log('Mock Login with:', email, password);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setMockSession('mock');
    notifyMockListeners();
    return;
  }

  clearMockSession();
  
  if (!auth) throw new Error('Firebase Auth not initialized');
  await signInWithEmailAndPassword(auth, email, password);
};

export const signup = async (email: string, password: string): Promise<void> => {
  if (USE_MOCK) {
    console.log('Mock Signup with:', email, password);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setMockSession('mock');
    notifyMockListeners();
    return;
  }

  clearMockSession();
  
  if (!auth) throw new Error('Firebase Auth not initialized');
  await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async (): Promise<void> => {
  const wasAgentSession = isAgentSessionActive();

  if (mockAuthType) {
    clearMockSession();
    notifyMockListeners();
  }

  if (USE_MOCK || wasAgentSession) {
    return;
  }

  if (!auth) throw new Error('Firebase Auth not initialized');
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void): () => void => {
  if (USE_MOCK || isAgentSessionActive()) {
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
  if (isAgentSessionActive()) {
    return mockUser;
  }
  return auth?.currentUser || null;
};

export const getAgentTestCredentials = (): { enabled: boolean; email: string; password: string } => ({
  enabled: AGENT_TEST_AUTH_ENABLED,
  email: AGENT_TEST_EMAIL,
  password: AGENT_TEST_PASSWORD,
});
