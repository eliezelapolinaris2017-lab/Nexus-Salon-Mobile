// Reemplaza estos valores con los de tu proyecto Firebase.
// Importante: en GitHub Pages usa SIEMPRE las credenciales web del proyecto correcto.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'REEMPLAZA_API_KEY',
  authDomain: 'REEMPLAZA_AUTH_DOMAIN',
  projectId: 'REEMPLAZA_PROJECT_ID',
  storageBucket: 'REEMPLAZA_STORAGE_BUCKET',
  messagingSenderId: 'REEMPLAZA_MESSAGING_SENDER_ID',
  appId: 'REEMPLAZA_APP_ID'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
};
