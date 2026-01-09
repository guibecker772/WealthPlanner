// src/services/simulationsRepo.js
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Caminho:
 * users/{uid}/data/simulations
 */
export function simulationsDocRef(db, uid) {
  return doc(db, "users", uid, "data", "simulations");
}

/**
 * Assina mudanças do Firestore
 */
export function subscribeSimulations(db, uid, onData, onError) {
  const ref = simulationsDocRef(db, uid);
  return onSnapshot(
    ref,
    (snap) => {
      const payload = snap.exists() ? snap.data() : null;
      onData(payload);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Salva lista inteira (merge para não apagar campos futuros)
 */
export async function saveSimulations(db, uid, list) {
  const ref = simulationsDocRef(db, uid);
  await setDoc(
    ref,
    {
      list,
      lastSaved: serverTimestamp(),
    },
    { merge: true }
  );
}
