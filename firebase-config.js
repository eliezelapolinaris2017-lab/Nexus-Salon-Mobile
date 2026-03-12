import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const firebaseConfig={apiKey:"AIzaSyA6-RrCXbPPZ4VqQRest1n_aojN-goPA",authDomain:"nexus-barber-shop.firebaseapp.com",projectId:"nexus-barber-shop",storageBucket:"nexus-barber-shop.firebasestorage.app",messagingSenderId:"524186377414",appId:"1:524186377414:web:96c867ede90a6139454bc7"};
const app=initializeApp(firebaseConfig); const db=getFirestore(app); const firebaseReady=true;
export { db, collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp, firebaseReady };