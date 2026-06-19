import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

// --- PARTES ---
export const getPartes = async () => {
  const snap = await getDocs(query(collection(db, 'partes'), orderBy('nombre')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getParte = async (id) => {
  const snap = await getDoc(doc(db, 'partes', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addParte = async (data) => {
  const { existenciaActual, ...resto } = data;
  return addDoc(collection(db, 'partes'), {
    ...resto,
    existencia: existenciaActual ?? data.existencia ?? 0,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  });
};

export const updateParte = async (id, data) => {
  return updateDoc(doc(db, 'partes', id), { ...data, actualizadoEn: new Date().toISOString() });
};

export const deleteParte = async (id) => {
  return deleteDoc(doc(db, 'partes', id));
};

export const suscribirPartes = (callback) => {
  return onSnapshot(collection(db, 'partes'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
    callback(data);
  });
};

// --- MOVIMIENTOS ---
export const getMovimientos = async () => {
  const snap = await getDocs(query(collection(db, 'movimientos'), orderBy('creadoEn', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addMovimiento = async (data) => {
  return addDoc(collection(db, 'movimientos'), { ...data, creadoEn: serverTimestamp() });
};

export const suscribirMovimientos = (callback) => {
  return onSnapshot(collection(db, 'movimientos'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => {
      const ta = a.creadoEn?.toMillis?.() ?? 0;
      const tb = b.creadoEn?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(data);
  });
};

// --- ACONDICIONAMIENTO ---
export const getAcondicionamientos = async () => {
  const snap = await getDocs(query(collection(db, 'acondicionamiento'), orderBy('creadoEn', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAcondicionamiento = async (id) => {
  const snap = await getDoc(doc(db, 'acondicionamiento', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addAcondicionamiento = async (data) => {
  return addDoc(collection(db, 'acondicionamiento'), {
    ...data,
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    completadoEn: null,
  });
};

export const updateAcondicionamiento = async (id, data) => {
  return updateDoc(doc(db, 'acondicionamiento', id), { ...data, actualizadoEn: serverTimestamp() });
};

export const suscribirAcondicionamientos = (callback) => {
  return onSnapshot(collection(db, 'acondicionamiento'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => {
      const ta = a.creadoEn?.toMillis?.() ?? a.fechaInicio?.toMillis?.() ?? 0;
      const tb = b.creadoEn?.toMillis?.() ?? b.fechaInicio?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(data);
  });
};

// --- PROGRESO ---
export const getProgreso = async (acondicionamientoId) => {
  const snap = await getDocs(
    query(collection(db, 'progreso'), where('acondicionamientoId', '==', acondicionamientoId), orderBy('creadoEn', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addProgreso = async (data) => {
  return addDoc(collection(db, 'progreso'), { ...data, creadoEn: serverTimestamp() });
};

// --- UBICACIONES ---
export const getUbicaciones = async () => {
  const snap = await getDocs(collection(db, 'ubicaciones'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addUbicacion = async (nombre) => {
  return addDoc(collection(db, 'ubicaciones'), { nombre, creadoEn: serverTimestamp() });
};

export const getPartesPorUbicacion = async (ubicacion) => {
  const snap = await getDocs(query(collection(db, 'partes'), where('ubicacion', '==', ubicacion)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- FABRICANTES ---
const FAB_DOC = () => doc(db, 'config', 'fabricantes');
const FABRICANTES_DEFAULT = ['MINDRAY', 'SNIBE', 'ORTHO', 'LIFOTRONIC', 'BIOMERIEUX', 'HORIBA', 'SIEMENS', 'BECKMAN', 'FUJIFILM'];

export const getFabricantes = async () => {
  const snap = await getDoc(FAB_DOC());
  if (snap.exists()) return snap.data().lista || FABRICANTES_DEFAULT;
  await updateDoc(FAB_DOC(), { lista: FABRICANTES_DEFAULT }).catch(() =>
    addDoc(collection(db, 'config'), { lista: FABRICANTES_DEFAULT })
  );
  return FABRICANTES_DEFAULT;
};

export const addFabricante = async (nombre) => {
  const actual = await getFabricantes();
  const nuevo = nombre.trim().toUpperCase();
  if (actual.includes(nuevo)) return actual;
  const nueva = [...actual, nuevo].sort();
  const ref = FAB_DOC();
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { lista: nueva });
  } else {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, { lista: nueva });
  }
  return nueva;
};

// --- USUARIOS ---
export const getUsuarios = async () => {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUsuario = async (uid) => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUsuario = async (uid, data) => {
  return updateDoc(doc(db, 'usuarios', uid), data);
};
