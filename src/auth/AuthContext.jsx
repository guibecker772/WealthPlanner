// src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "../services/firebase"; // ajuste se seu caminho for outro

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase User
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Força re-render quando você atualiza profile (displayName, photoURL)
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
    } catch {
      // ignore
    }
    // cria nova referência para disparar render
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const register = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user && name) {
      await updateProfile(userCredential.user, { displayName: name });
      await refreshUser();
    }
    return userCredential;
  };

  const logout = () => signOut(auth);

  // ✅ fbUser = alias do user (para manter compatibilidade com seus pages)
  const value = useMemo(
    () => ({
      user,
      fbUser: user,
      loading,
      login,
      loginGoogle,
      register,
      logout,
      refreshUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
