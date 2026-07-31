// js/firebase-config.js
// Configuración e inicialización compartida de Firebase para todo el sitio.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQJ9sazo_o7S0EcZn_m2zgQnSQ1zAGcpo",
  authDomain: "frame-9bd7a.firebaseapp.com",
  databaseURL: "https://frame-9bd7a-default-rtdb.firebaseio.com",
  projectId: "frame-9bd7a",
  storageBucket: "frame-9bd7a.firebasestorage.app",
  messagingSenderId: "332894400128",
  appId: "1:332894400128:web:f6112ab1b2ea673d238065",
  measurementId: "G-010VC4M566",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics es opcional y falla en algunos entornos (ej. abrir el archivo
// directamente con file://), así que lo protegemos.
isSupported()
  .then((soportado) => {
    if (soportado) getAnalytics(app);
  })
  .catch(() => {});

export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
};
