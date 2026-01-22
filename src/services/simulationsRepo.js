// src/services/simulationsRepo.js
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

function normalizeSimDoc(docSnap) {
  const data = docSnap.data() || {};
  const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || null;
  const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || null;

  return {
    id: docSnap.id,
    name: data.name || "Cenário",
    data: data.data || {},
    updatedAt,
    createdAt,
  };
}

export async function listSimulations(db, uid) {
  if (!uid) return [];
  const col = collection(db, "users", uid, "simulations");
  const q = query(col, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeSimDoc);
}

export function subscribeSimulations(db, uid, onData, onError) {
  if (!uid) return () => {};
  const col = collection(db, "users", uid, "simulations");
  const q = query(col, orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(normalizeSimDoc);
      onData?.(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function saveSimulation(db, uid, sim, options = {}) {
  if (!uid || !sim?.id) return;
  const ref = doc(db, "users", uid, "simulations", sim.id);
  const payload = {
    name: sim.name || "Cenário",
    data: sim.data || {},
    updatedAt: serverTimestamp(),
  };

  if (options.isNew) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });
}

export async function deleteSimulation(db, uid, simId) {
  if (!uid || !simId) return;
  const ref = doc(db, "users", uid, "simulations", simId);
  await deleteDoc(ref);
}

export async function upsertSimulationsBatch(db, uid, sims = []) {
  if (!uid || !sims.length) return;
  const batch = writeBatch(db);

  sims.forEach((sim) => {
    if (!sim?.id) return;
    const ref = doc(db, "users", uid, "simulations", sim.id);
    batch.set(
      ref,
      {
        name: sim.name || "Cenário",
        data: sim.data || {},
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}
