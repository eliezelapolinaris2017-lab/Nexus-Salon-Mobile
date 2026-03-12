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

// Pega aquí tus credenciales reales de Firebase.
// Si lo dejas así, la app funciona en modo demo local.
const firebaseConfig = {
  apiKey: 'REEMPLAZA_API_KEY',
  authDomain: 'REEMPLAZA_AUTH_DOMAIN',
  projectId: 'REEMPLAZA_PROJECT_ID',
  storageBucket: 'REEMPLAZA_STORAGE_BUCKET',
  messagingSenderId: 'REEMPLAZA_MESSAGING_SENDER_ID',
  appId: 'REEMPLAZA_APP_ID'
};

const hasRealConfig = !Object.values(firebaseConfig).some(v => String(v).startsWith('REEMPLAZA_'));

let app = null;
let db = null;
let firebaseReady = false;

if (hasRealConfig) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  firebaseReady = true;
}

export {
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  firebaseReady
};
