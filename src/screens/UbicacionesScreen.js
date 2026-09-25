import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUbicaciones, addUbicacion, deleteUbicacion } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

export default function UbicacionesScreen({ navigation }) {
  const { perfil } = useAuth();
  const puedeSubdividir = esAdmin(perfil);
  const [subdividiendoId, setSubdividiendoId] = useState(null);
  const [subCantidad, setSubCantidad] = useState('4');
  const [creandoSubs, setCreandoSubs] = useState(false);
  const [subError, setSubError] = useState('');
  const [ubicaciones, setUbicaciones] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [nueva, setNueva] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [imprimiendo, setImprimiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [ubics, partesSnap] = await Promise.all([
        getUbicaciones(),
        getDocs(collection(db, 'partes')),
      ]);
      const partes = partesSnap.docs.map(d => d.data());
      const stock = (p) => p.existencia ?? p.existenciaActual ?? p.cantidad ?? 0;
      const nombres = new Set(ubics.map(u => u.nombre));
      // Una subdivisión se llama "<padre>.<n>" (ej. A1.2); es hija solo si el padre existe.
      const padreDe = (nombre) => {
        const i = (nombre || '').lastIndexOf('.');
        if (i <= 0) return null;
        const padre = nombre.slice(0, i);
        return nombres.has(padre) ? padre : null;
      };
      const ubicsConConteo = ubics.map(u => {
        const enUbic = partes.filter(p => p.ubicacion === u.nombre);
        const enSubs = partes.filter(p => (p.ubicacion || '').startsWith(`${u.nombre}.`));
        return {
          ...u,
          refacciones: enUbic.length,
          piezas: enUbic.reduce((sum, p) => sum + stock(p), 0),
          subRefacciones: enSubs.length,
          subPiezas: enSubs.reduce((sum, p) => sum + stock(p), 0),
          padre: padreDe(u.nombre),
        };
      });
      ubicsConConteo.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
      setUbicaciones(ubicsConConteo);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = ubicaciones.filter(u =>
    !filtro || u.nombre?.toLowerCase().includes(filtro.toLowerCase())
  );

  const todosSeleccionados =
    filtradas.length > 0 && filtradas.every(u => seleccionados.has(u.id));

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(filtradas.map(u => u.id)));
    }
  };

  const handleAgregar = async () => {
    const nombre = nueva.trim();
    if (!nombre) return;
    setGuardando(true);
    try {
      await addUbicacion(nombre);
      setNueva('');
      await cargar();
    } catch {}
    setGuardando(false);
  };

  const abrirSubdividir = (item) => {
    setSubdividiendoId(subdividiendoId === item.id ? null : item.id);
    setSubCantidad('4');
    setSubError('');
  };

  const crearSubdivisiones = async (item) => {
    const n = parseInt(subCantidad, 10);
    if (!n || n < 1 || n > 20) { setSubError('Escribe un número entre 1 y 20.'); return; }
    const existentes = new Set(ubicaciones.map(u => u.nombre));
    setCreandoSubs(true);
    setSubError('');
    try {
      for (let i = 1; i <= n; i++) {
        const nombre = `${item.nombre}.${i}`;
        if (!existentes.has(nombre)) await addUbicacion(nombre);
      }
      setSubdividiendoId(null);
      await cargar();
    } catch {
      setSubError('No se pudieron crear todas. Intenta de nuevo.');
      await cargar();
    }
    setCreandoSubs(false);
  };

  const handleEliminar = async (item) => {
    setEliminando(true);
    try {
      await deleteUbicacion(item.id);
      setConfirmDelete(null);
      setSeleccionados(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      await cargar();
    } catch {}
    setEliminando(false);
  };

  const buildPrintWindow = (entries) => {
    const cards = entries.map(e => `
      <div class="qr-card">
        <img src="${e.dataUrl}" alt="QR" />
        <div class="label">${e.nombre}</div>
        <div class="sub">Diagnóstica Internacional</div>
      </div>`).join('');

    return `<!DOCTYPE html><html><head><title>QR Ubicaciones</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:8mm}
      .grid{display:flex;flex-wrap:wrap;gap:6mm}
      .qr-card{
        width:7.5cm;text-align:center;padding:4mm;
        border:1.5px solid #ccc;border-radius:4mm;
        break-inside:avoid;page-break-inside:avoid
      }
      .qr-card img{width:5cm;height:5cm;display:block;margin:0 auto}
      .label{font-size:10pt;font-weight:bold;color:#0B2447;margin-top:3mm;word-break:break-word;text-transform:uppercase}
      .sub{font-size:7pt;color:#888;margin-top:2mm;text-transform:uppercase}
      @media print{body{padding:4mm}.qr-card{border-color:#999}}
    </style></head><body>
    <div class="grid">${cards}</div>
    <script>setTimeout(function(){window.print();},500);<\/script>
    </body></html>`;
  };

  const qrContent = (nombre) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}?u=${encodeURIComponent(nombre)}`;
    }
    return nombre;
  };

  const imprimirUno = async (nombre) => {
    if (Platform.OS !== 'web') return;
    try {
      const QRCode = require('qrcode');
      const dataUrl = await QRCode.toDataURL(qrContent(nombre), { width: 600, margin: 1, color: { dark: '#0B2447', light: '#FFFFFF' } });
      const win = window.open('', '_blank', 'width=420,height=520');
      if (!win) return;
      win.document.write(buildPrintWindow([{ nombre, dataUrl }]));
      win.document.close();
    } catch {}
  };

  const imprimirSeleccionados = async () => {
    if (Platform.OS !== 'web' || seleccionados.size === 0) return;
    setImprimiendo(true);
    try {
      const QRCode = require('qrcode');
      const items = filtradas.filter(u => seleccionados.has(u.id));
      const entries = await Promise.all(
        items.map(async u => ({
          nombre: u.nombre,
          dataUrl: await QRCode.toDataURL(qrContent(u.nombre), { width: 600, margin: 1, color: { dark: '#0B2447', light: '#FFFFFF' } }),
        }))
      );
      const win = window.open('', '_blank');
      if (!win) { setImprimiendo(false); return; }
      win.document.write(buildPrintWindow(entries));
      win.document.close();
    } catch {}
    setImprimiendo(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📍 Ubicaciones</Text>
        <Text style={styles.sub}>{ubicaciones.length} registradas</Text>
      </View>

      <View style={styles.body}>
        {/* Nueva ubicación */}
        <View style={styles.nuevaBox}>
          <Text style={styles.nuevaLabel}>NUEVA UBICACIÓN</Text>
          <View style={styles.nuevaRow}>
            <TextInput
              style={styles.nuevaInput}
              placeholder="Ej: Rack A · Cajón 3"
              placeholderTextColor="#bbb"
              value={nueva}
              onChangeText={setNueva}
              onSubmitEditing={handleAgregar}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.agregarBtn} onPress={handleAgregar} disabled={guardando}>
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.agregarText}>+ Agregar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Buscador + Todos */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="🔍  Buscar ubicación..."
            placeholderTextColor="#aaa"
            value={filtro}
            onChangeText={text => { setFiltro(text); setSeleccionados(new Set()); }}
          />
          <TouchableOpacity
            style={[styles.todosBtn, todosSeleccionados && styles.todosBtnActive]}
            onPress={toggleTodos}
          >
            <Text style={styles.todosBtnText}>
              {todosSeleccionados ? '✓ Todos' : 'Todos'}
            </Text>
          </TouchableOpacity>
        </View>

        {seleccionados.size > 0 && (
          <Text style={styles.seleccionadosHint}>
            {seleccionados.size} seleccionada{seleccionados.size !== 1 ? 's' : ''} — toca 🖨️ o el botón de abajo para imprimir
          </Text>
        )}

        <FlatList
          data={filtradas}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const seleccionado = seleccionados.has(item.id);
            const tieneSubs = item.subRefacciones > 0 || ubicaciones.some(u => u.padre === item.nombre);
            return (
              <View style={item.padre ? styles.subWrap : null}>
              <View style={[styles.card, item.padre && styles.cardHija, seleccionado && styles.cardSelected]}>
                {/* Checkbox */}
                <TouchableOpacity
                  style={[styles.checkbox, seleccionado && styles.checkboxActive]}
                  onPress={() => toggleSeleccion(item.id)}
                >
                  {seleccionado && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                {/* Info — navega a refacciones */}
                <TouchableOpacity
                  style={styles.cardInfo}
                  onPress={() => navigation.navigate('EscanearQR', { ubicacionInicial: item.nombre })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardNombre}>{item.padre ? '↳ ' : ''}{item.nombre}</Text>
                  <Text style={styles.cardSub}>
                    {item.refacciones + item.subRefacciones} refacción{item.refacciones + item.subRefacciones !== 1 ? 'es' : ''} · {item.piezas + item.subPiezas} pz
                  </Text>
                  {tieneSubs ? (
                    <Text style={styles.cardSubDetalle}>
                      {item.refacciones} en {item.nombre} · {item.subRefacciones} en subdivisiones
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* Acciones */}
                {confirmDelete === item.id ? (
                  <View style={styles.deleteConfirmRow}>
                    <Text style={styles.deleteConfirmLabel}>¿Eliminar?</Text>
                    <TouchableOpacity
                      style={styles.deleteConfirmSi}
                      onPress={() => handleEliminar(item)}
                      disabled={eliminando}
                    >
                      {eliminando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.deleteConfirmSiText}>Sí</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConfirmNo}
                      onPress={() => setConfirmDelete(null)}
                      disabled={eliminando}
                    >
                      <Text style={styles.deleteConfirmNoText}>No</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.cardBtns}>
                    {puedeSubdividir && !item.padre && (
                      <TouchableOpacity style={styles.btnSubdividir} onPress={() => abrirSubdividir(item)}>
                        <Text style={{ fontSize: 15 }}>🗂️</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.btnPrint} onPress={() => imprimirUno(item.nombre)}>
                      <Text style={{ fontSize: 15 }}>🖨️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnDelete} onPress={() => setConfirmDelete(item.id)}>
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {subdividiendoId === item.id && (
                <View style={styles.subPanel}>
                  <Text style={styles.subPanelTitulo}>Subdividir {item.nombre}</Text>
                  <Text style={styles.subPanelHint}>
                    Se crearán {item.nombre}.1, {item.nombre}.2… (las que ya existan se omiten).
                  </Text>
                  <View style={styles.subPanelRow}>
                    <TextInput
                      style={styles.subPanelInput}
                      value={subCantidad}
                      onChangeText={v => { setSubCantidad(v); setSubError(''); }}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.subPanelCancelar} onPress={() => setSubdividiendoId(null)} disabled={creandoSubs}>
                      <Text style={styles.subPanelCancelarText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subPanelCrear} onPress={() => crearSubdivisiones(item)} disabled={creandoSubs}>
                      {creandoSubs
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.subPanelCrearText}>Crear</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {!!subError && <Text style={styles.subPanelError}>⚠️ {subError}</Text>}
                </View>
              )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filtro ? 'Sin resultados.' : 'No hay ubicaciones registradas.'}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: seleccionados.size > 0 ? 100 : 40 }}
        />
      </View>

      {/* FAB impresión en lote */}
      {seleccionados.size > 0 && (
        <TouchableOpacity style={styles.fab} onPress={imprimirSeleccionados} disabled={imprimiendo}>
          {imprimiendo
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.fabText}>
                🖨️ Imprimir {seleccionados.size} QR{seleccionados.size !== 1 ? 's' : ''}
              </Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  body: { flex: 1, padding: 14 },
  nuevaBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  nuevaLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 0.5, marginBottom: 10 },
  nuevaRow: { flexDirection: 'row', gap: 10 },
  nuevaInput: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 12, fontSize: 13, borderWidth: 1, borderColor: '#e0e0e0', color: '#1a1a2e' },
  agregarBtn: { backgroundColor: AZUL, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', minWidth: 90, alignItems: 'center' },
  agregarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0', color: '#1a1a2e' },
  todosBtn: { backgroundColor: AZUL, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  todosBtnActive: { backgroundColor: '#1976D2' },
  todosBtnText: { color: '#fff', fontWeight: '700' },
  seleccionadosHint: { fontSize: 12, color: '#1976D2', fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1, gap: 10 },
  cardSelected: { borderWidth: 1.5, borderColor: '#1976D2', backgroundColor: '#F0F7FF' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  subWrap: { marginLeft: 22 },
  cardHija: { borderLeftWidth: 3, borderLeftColor: '#90CAF9', backgroundColor: '#FAFCFF' },
  cardSubDetalle: { fontSize: 11, color: '#1976D2', marginTop: 2, fontWeight: '600' },
  btnSubdividir: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#90CAF9' },
  subPanel: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 10, marginTop: -4, borderWidth: 1, borderColor: '#90CAF9' },
  subPanelTitulo: { fontSize: 13, fontWeight: '800', color: '#0B2447' },
  subPanelHint: { fontSize: 12, color: '#555', marginTop: 4, marginBottom: 10 },
  subPanelRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  subPanelInput: { width: 60, backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 16, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  subPanelCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 11, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  subPanelCancelarText: { color: '#555', fontWeight: '700', fontSize: 13 },
  subPanelCrear: { flex: 1, backgroundColor: '#1976D2', borderRadius: 10, padding: 11, alignItems: 'center' },
  subPanelCrearText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  subPanelError: { color: '#C62828', fontSize: 12, fontWeight: '600', marginTop: 8 },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardBtns: { flexDirection: 'row', gap: 6 },
  btnPrint: { backgroundColor: '#1976D2', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnDelete: { borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#F44336' },
  deleteConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteConfirmLabel: { fontSize: 12, fontWeight: '700', color: '#C62828' },
  deleteConfirmSi: { backgroundColor: '#C62828', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 36, alignItems: 'center' },
  deleteConfirmSiText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteConfirmNo: { backgroundColor: '#F5F6FA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd' },
  deleteConfirmNoText: { color: '#555', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: '#1976D2', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.4, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
