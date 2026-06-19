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
  return addDoc(collection(db, 'partes'), { ...data, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
};

export const updateParte = async (id, data) => {
  return updateDoc(doc(db, 'partes', id), { ...data, actualizadoEn: serverTimestamp() });
};

export const deleteParte = async (id) => {
  return deleteDoc(doc(db, 'partes', id));
};

export const suscribirPartes = (callback) => {
  return onSnapshot(query(collection(db, 'partes'), orderBy('nombre')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
  return onSnapshot(query(collection(db, 'movimientos'), orderBy('creadoEn', 'desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
  return onSnapshot(query(collection(db, 'acondicionamiento'), orderBy('creadoEn', 'desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
