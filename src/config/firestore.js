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
  return addDoc(collection(db, 'movimientos'), { ...data, creadoEn: new Date().toISOString() });
};

export const suscribirMovimientos = (callback) => {
  return onSnapshot(collection(db, 'movimientos'), async snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const toMs = v => v?.toMillis?.() ?? (v ? new Date(v).getTime() : 0);
    data.sort((a, b) => toMs(b.creadoEn) - toMs(a.creadoEn));

    // Para movimientos sin nombre de parte, buscarlo por parteId
    const sinNombre = data.filter(m => !m.nombreParte && !m.nombre && m.parteId);
    if (sinNombre.length > 0) {
      const ids = [...new Set(sinNombre.map(m => m.parteId))];
      const parteSnaps = await Promise.all(ids.map(id => getDoc(doc(db, 'partes', id))));
      const parteMap = {};
      parteSnaps.forEach(s => { if (s.exists()) parteMap[s.id] = s.data(); });
      data.forEach(m => {
        if (!m.nombreParte && !m.nombre && m.parteId && parteMap[m.parteId]) {
          const p = parteMap[m.parteId];
          m.nombreParte = p.nombre || '';
          if (!m.codigoParte && !m.codigo) m.codigoParte = p.codigo || null;
          if (!m.fabricante) m.fabricante = p.fabricante || null;
          if (!m.ubicacion) m.ubicacion = p.ubicacion || null;
        }
      });
    }

    callback(data);
  });
};

export const registrarMovimiento = async (parteId, tipo, cantidad, nota, perfil) => {
  const parteSnap = await getDoc(doc(db, 'partes', parteId));
  if (!parteSnap.exists()) throw new Error('Parte no encontrada');
  const d = parteSnap.data();
  const existenciaActual = d.existencia ?? d.existenciaActual ?? 0;
  const nuevaExistencia = tipo === 'entrada'
    ? existenciaActual + cantidad
    : Math.max(0, existenciaActual - cantidad);

  await updateDoc(doc(db, 'partes', parteId), {
    existencia: nuevaExistencia,
    actualizadoEn: new Date().toISOString(),
    ...(perfil ? { actualizadoPor: { nombre: perfil.nombre, email: perfil.email, uid: perfil.id } } : {}),
  });

  await addDoc(collection(db, 'movimientos'), {
    parteId,
    nombreParte: d.nombre || '',
    codigoParte: d.codigo || null,
    fabricante: d.fabricante || null,
    ubicacion: d.ubicacion || null,
    tipo,
    cantidad,
    nota: nota?.trim() || null,
    existenciaAnterior: existenciaActual,
    existenciaNueva: nuevaExistencia,
    usuario: perfil?.nombre || perfil?.email || 'Sistema',
    creadoEn: new Date().toISOString(),
  });

  return nuevaExistencia;
};

// --- ACONDICIONAMIENTO ---
export const getAcondicionamientos = async () => {
  const snap = await getDocs(collection(db, 'acondicionamientos'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  data.sort((a, b) => {
    const ta = a.creadoEn ? new Date(a.creadoEn?.toDate?.() ?? a.creadoEn).getTime() : 0;
    const tb = b.creadoEn ? new Date(b.creadoEn?.toDate?.() ?? b.creadoEn).getTime() : 0;
    return tb - ta;
  });
  return data;
};

export const getAcondicionamiento = async (id) => {
  const snap = await getDoc(doc(db, 'acondicionamientos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addAcondicionamiento = async (data) => {
  return addDoc(collection(db, 'acondicionamientos'), {
    ...data,
    estado: 'pendiente',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    completadoEn: null,
  });
};

export const updateAcondicionamiento = async (id, data) => {
  return updateDoc(doc(db, 'acondicionamientos', id), { ...data, actualizadoEn: new Date().toISOString() });
};

const sortAcond = (data) => {
  data.sort((a, b) => {
    const toMs = v => v?.toMillis?.() ?? (v ? new Date(v).getTime() : 0);
    return toMs(b.creadoEn ?? b.fechaInicio ?? b.fecha) - toMs(a.creadoEn ?? a.fechaInicio ?? a.fecha);
  });
  return data;
};

export const suscribirAcondicionamientos = (callback) => {
  const state = { singular: [], plural: [] };
  const emit = () => {
    const ids = new Set();
    const merged = [...state.singular, ...state.plural].filter(d => {
      if (ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    });
    callback(sortAcond(merged));
  };

  const unsub1 = onSnapshot(collection(db, 'acondicionamiento'), snap => {
    state.singular = snap.docs.map(d => ({ id: d.id, _col: 'acondicionamiento', ...d.data() }));
    emit();
  }, () => {});

  const unsub2 = onSnapshot(collection(db, 'acondicionamientos'), snap => {
    state.plural = snap.docs.map(d => ({ id: d.id, _col: 'acondicionamientos', ...d.data() }));
    emit();
  }, () => {});

  return () => { unsub1(); unsub2(); };
};

// --- PROGRESO ---
export const getProgreso = async (acondicionamientoId) => {
  const snap = await getDocs(
    query(collection(db, 'progreso'), where('acondicionamientoId', '==', acondicionamientoId))
  );
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  data.sort((a, b) => {
    const ta = a.creadoEn ? new Date(a.creadoEn?.toDate?.() ?? a.creadoEn).getTime() : 0;
    const tb = b.creadoEn ? new Date(b.creadoEn?.toDate?.() ?? b.creadoEn).getTime() : 0;
    return tb - ta;
  });
  return data;
};

export const addProgreso = async (data) => {
  return addDoc(collection(db, 'progreso'), { ...data, creadoEn: new Date().toISOString() });
};

// --- UBICACIONES ---
export const getUbicaciones = async () => {
  const snap = await getDocs(collection(db, 'ubicaciones'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addUbicacion = async (nombre) => {
  return addDoc(collection(db, 'ubicaciones'), { nombre, creadoEn: new Date().toISOString() });
};

export const deleteUbicacion = async (id) => {
  return deleteDoc(doc(db, 'ubicaciones', id));
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

export const suscribirFabricantes = (callback) => {
  return onSnapshot(FAB_DOC(), snap => {
    callback(snap.exists() ? (snap.data().lista || FABRICANTES_DEFAULT) : FABRICANTES_DEFAULT);
  }, () => callback(FABRICANTES_DEFAULT));
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

export const deleteMovimiento = async (id) => {
  return deleteDoc(doc(db, 'movimientos', id));
};

// --- EQUIPOS ---
export const suscribirEquipos = (callback) => {
  return onSnapshot(collection(db, 'equipos'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (a.modelo || '').localeCompare(b.modelo || '', 'es'));
    callback(data);
  });
};

export const getEquipo = async (id) => {
  const snap = await getDoc(doc(db, 'equipos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addEquipo = async (data) => {
  return addDoc(collection(db, 'equipos'), {
    ...data,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  });
};

export const updateEquipo = async (id, data) => {
  return updateDoc(doc(db, 'equipos', id), { ...data, actualizadoEn: new Date().toISOString() });
};

export const deleteEquipo = async (id) => {
  return deleteDoc(doc(db, 'equipos', id));
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
