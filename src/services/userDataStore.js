// src/services/userDataStore.js
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Documento por usuário:
 * users/{uid}/wealthplanner/state
 */
function plannerDoc(uid) {
  return doc(db, "users", uid, "wealthplanner", "state");
}

export async function loadUserPlannerState(uid) {
  if (!uid) return null;

  const snap = await getDoc(plannerDoc(uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return data?.state || null; // { simulations, activeSimId }
}

export async function saveUserPlannerState(uid, state) {
  if (!uid) return;

  await setDoc(
    plannerDoc(uid),
    {
      state,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
