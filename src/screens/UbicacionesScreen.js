import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUbicaciones, addUbicacion, deleteUbicacion } from '../config/firestore';

export default function UbicacionesScreen({ navigation }) {
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
      const ubicsConConteo = ubics.map(u => {
        const enUbic = partes.filter(p => p.ubicacion === u.nombre);
        const piezas = enUbic.reduce(
          (sum, p) => sum + (p.existencia ?? p.existenciaActual ?? p.cantidad ?? 0),
          0
        );
        return { ...u, refacciones: enUbic.length, piezas };
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
      .label{font-size:10pt;font-weight:bold;color:#0B2447;margin-top:3mm;word-break:break-word}
      .sub{font-size:7pt;color:#888;margin-top:2mm}
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
            return (
              <View style={[styles.card, seleccionado && styles.cardSelected]}>
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
                  <Text style={styles.cardNombre}>{item.nombre}</Text>
                  <Text style={styles.cardSub}>
                    {item.refacciones} refacción{item.refacciones !== 1 ? 'es' : ''} · {item.piezas} pz
                  </Text>
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
                    <TouchableOpacity style={styles.btnPrint} onPress={() => imprimirUno(item.nombre)}>
                      <Text style={{ fontSize: 15 }}>🖨️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnDelete} onPress={() => setConfirmDelete(item.id)}>
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                    </TouchableOpacity>
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
