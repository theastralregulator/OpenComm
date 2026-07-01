/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Read configuration from environment variables with direct fallbacks to the provisioned Applet credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAkvW-SKgxpbDNiEdZG1v2HAjeBOnDn1B8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0937242344.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0937242344",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0937242344.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "191868060407",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:191868060407:web:3477868b71646b433b89f2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-opencomm-9d344e63-e5ee-4037-9d3e-93c30ccfa525",
};

// Check if basic required fields are present
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    const settings = { 
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true
    };
    db = firebaseConfig.databaseId 
      ? initializeFirestore(app, settings, firebaseConfig.databaseId) 
      : initializeFirestore(app, settings);
    storage = getStorage(app);
    
    console.info('⚡ OpenComm: Firebase successfully initialized.');
  } catch (error) {
    console.error('❌ OpenComm: Error initializing Firebase:', error);
  }
} else {
  console.warn(
    `🚧 OpenComm: Firebase credentials are not fully configured.\n` +
    `Please configure the following environment variables in your Secrets/Environment panel:\n` +
    `- VITE_FIREBASE_API_KEY\n` +
    `- VITE_FIREBASE_AUTH_DOMAIN\n` +
    `- VITE_FIREBASE_PROJECT_ID\n` +
    `- VITE_FIREBASE_STORAGE_BUCKET\n` +
    `- VITE_FIREBASE_MESSAGING_SENDER_ID\n` +
    `- VITE_FIREBASE_APP_ID\n` +
    `The application will operate in offline/local mock mode until these credentials are provided.`
  );
}

export { app, auth, db, storage };
export default firebaseConfig;
