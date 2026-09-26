import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

/**
 * Web configuration of the Firebase project. These values only identify the project and are public
 * by design: what protects the data are the Firestore security rules (firestore.rules).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCP2-21YFcJxlfkhvdTJgzLNozeACsE8Vk',
  authDomain: 'reformas-app-5f07c.firebaseapp.com',
  projectId: 'reformas-app-5f07c',
  storageBucket: 'reformas-app-5f07c.firebasestorage.app',
  messagingSenderId: '480717913822',
  appId: '1:480717913822:web:548240711d02c045fbcc4f',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Optional fields left as `undefined` (e.g. a removed finish) are skipped instead of rejected.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
