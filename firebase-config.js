import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyA6-RrCXbPPVPZ4VqQRest1n_aojN-goPA",
  authDomain: "nexus-barber-shop.firebaseapp.com",
  projectId: "nexus-barber-shop",
  storageBucket: "nexus-barber-shop.firebasestorage.app",
  messagingSenderId: "524186377414",
  appId: "1:524186377414:web:96c867ede90a6139454bc7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut };
