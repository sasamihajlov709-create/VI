/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Credentials derived from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCWPW95WtYUwYBMH6hwPfq3pp4FNPNuV7A",
  authDomain: "sylvan-primacy-fwfkz.firebaseapp.com",
  projectId: "sylvan-primacy-fwfkz",
  storageBucket: "sylvan-primacy-fwfkz.firebasestorage.app",
  messagingSenderId: "907012181594",
  appId: "1:907012181594:web:0b7b6f7ecddad1fd981263"
};

// Initialize app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistent session storage
const auth = getAuth(app);

// Initialize Firestore with robust local IndexedDB cache persistence with safe fallbacks for sandboxed environments
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, "ai-studio-03df1928-84c7-4b65-808b-917a3bc54b8c");
} catch (e) {
  console.warn("Failed to initialize Firestore with persistent local cache, trying default settings with database ID:", e);
  try {
    db = initializeFirestore(app, {}, "ai-studio-03df1928-84c7-4b65-808b-917a3bc54b8c");
  } catch (e2) {
    console.warn("Failed to initialize Firestore with database ID, trying to get existing Firestore instance:", e2);
    try {
      db = getFirestore(app, "ai-studio-03df1928-84c7-4b65-808b-917a3bc54b8c");
    } catch (e3) {
      console.warn("Failed to get named database, falling back to default database instance:", e3);
      try {
        db = getFirestore(app);
      } catch (e4) {
        console.error("Critical error: Failed to initialize Firestore completely", e4);
        db = {} as any;
      }
    }
  }
}

const storage = getStorage(app);

export { app, auth, db, storage };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

