// src/services/firebase.js
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ COLE SUAS CHAVES DO FIREBASE AQUI ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyCnwY1plM50GYghPwc41koxXPH6WsFYH1o",
  authDomain: "wealthplanner-511b0.firebaseapp.com",
  projectId: "wealthplanner-511b0",
  storageBucket: "wealthplanner-511b0.firebasestorage.app",
  messagingSenderId: "745861111094",
  appId: "1:745861111094:web:13575987e2ae81d2966797",
};

// ✅ Evita erro "Firebase app already initialized" (Vite/HMR)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Auth
export const auth = getAuth(app);

// ✅ Provider Google (login com Google)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// ✅ Firestore (se quiser evoluir pra salvar em nuvem)
export const db = getFirestore(app);
