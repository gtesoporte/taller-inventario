import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getParte, deleteParte, registrarMovimiento } from '../config/firestore';
import { useAuth } from '../context/AuthContext';

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{display}</Text>
    </View>
  );
}

function formatFecha(ts) {
  try {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function getExistencia(parte) {
  const candidatos = ['existencia', 'existenciaActual', 'existencias', 'cantidad', 'stock', 'piezas', 'inventario', 'total', 'qty'];
  for (const campo of candidatos) {
    if (parte[campo] !== undefined && parte[campo] !== null) return { valor: parte[campo], campo };
  }
  return { valor: 0, campo: null };
}

function extractNombre(val) {
  if (!val) return '';
  if (typeof val === 'object') return val.nombre || val.email || JSON.stringify(val);
  return String(val);
}

export default function DetalleParteScreen({ route, navigation }) {
  const id = route?.params?.id;
  const { perfil } = useAuth();

  const [parte, setParte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Movimiento inline
  const [movOp, setMovOp] = useState(null); // null | 'entrada' | 'salida'
  const [movCantidad, setMovCantidad] = useState('1');
  const [movNota, setMovNota] = useState('');
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [existenciaLocal, setExistenciaLocal] = useState(null);

  // Eliminar inline
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!id) { setErrorMsg('No se recibió el ID de la refacción.'); setLoading(false); return; }
    getParte(id)
      .then(p => { setParte(p); setLoading(false); })
      .catch(e => { setErrorMsg(e?.message || 'Error al cargar la refacción.'); setLoading(false); });
  }, [id]);

  const abrirMovimiento = (op) => {
    setMovOp(op);
    setMovCantidad('1');
    setMovNota('');
  };

  const handleGuardarMovimiento = async () => {
    const cant = parseInt(movCantidad, 10);
    if (!cant || cant <= 0) return;
    setGuardandoMov(true);
    try {
      const nuevaExistencia = await registrarMovimiento(id, movOp, cant, movNota, perfil);
      setExistenciaLocal(nuevaExistencia);
      setMovOp(null);
    } catch {}
    setGuardandoMov(false);
  };

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await deleteParte(id);
      navigation.goBack();
    } catch {
      setEliminando(false);
      setConfirmEliminar(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }
  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#c00', textAlign: 'center', padding: 20 }}>Error: {errorMsg}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: '#1565C0' }}>← Volver</Text></TouchableOpacity>
      </View>
    );
  }
  if (!parte) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#999', marginBottom: 16 }}>No encontrada (id: {id})</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: '#1565C0' }}>← Volver</Text></TouchableOpacity>
      </View>
    );
  }

  const existencia = existenciaLocal ?? getExistencia(parte).valor;
  const esEntradaActiva = movOp === 'entrada';
  const esSalidaActiva = movOp === 'salida';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.editarBtn} onPress={() => navigation.navigate('FormParte', { id, parte })}>
              <Text style={styles.editarText}>✏️ Editar</Text>
            </TouchableOpacity>
            {confirmEliminar ? (
              <View style={styles.eliminarConfirm}>
                <TouchableOpacity style={styles.eliminarSiBtn} onPress={handleEliminar} disabled={eliminando}>
                  {eliminando
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.eliminarSiText}>Eliminar</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmEliminar(false)}>
                  <Text style={styles.eliminarNoText}>No</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.eliminarBtn} onPress={() => setConfirmEliminar(true)}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.nombre}>{parte.nombre ? String(parte.nombre).toUpperCase() : '—'}</Text>

        {/* Existencia + botones de movimiento */}
        <View style={styles.existenciaRow}>
          <View style={[
            styles.existenciaCard,
            existencia <= 0 && styles.existenciaCardRed,
          ]}>
            <Text style={styles.existenciaNum}>{existencia}</Text>
            <Text style={styles.existenciaLabel}> piezas</Text>
          </View>
          <View style={styles.movBtns}>
            <TouchableOpacity
              style={[styles.movBtn, styles.entradaBtn, esEntradaActiva && styles.movBtnActive]}
              onPress={() => movOp === 'entrada' ? setMovOp(null) : abrirMovimiento('entrada')}
            >
              <Text style={styles.movBtnText}>▲ Entrada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.movBtn, styles.salidaBtn, esSalidaActiva && styles.movBtnActive]}
              onPress={() => movOp === 'salida' ? setMovOp(null) : abrirMovimiento('salida')}
            >
              <Text style={styles.movBtnText}>▼ Salida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* PANEL DE MOVIMIENTO */}
      {movOp && (
        <View style={[styles.movPanel, esEntradaActiva ? styles.movPanelEntrada : styles.movPanelSalida]}>
          <Text style={styles.movPanelTitulo}>
            {esEntradaActiva ? '▲ Registrar entrada' : '▼ Registrar salida'}
          </Text>
          <View style={styles.movPanelRow}>
            <View style={styles.movCantidadBox}>
              <Text style={styles.movCantidadLabel}>Cantidad</Text>
              <TextInput
                style={styles.movCantidadInput}
                value={movCantidad}
                onChangeText={setMovCantidad}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.movCantidadLabel}>Nota / Motivo (opcional)</Text>
              <TextInput
                style={styles.movNotaInput}
                value={movNota}
                onChangeText={setMovNota}
                placeholder="Ej: Mantenimiento preventivo"
                placeholderTextColor="#bbb"
              />
            </View>
          </View>
          <View style={styles.movPanelBtns}>
            <TouchableOpacity style={styles.movCancelarBtn} onPress={() => setMovOp(null)} disabled={guardandoMov}>
              <Text style={styles.movCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.movConfirmarBtn, esEntradaActiva ? styles.movConfirmarEntrada : styles.movConfirmarSalida]} onPress={handleGuardarMovimiento} disabled={guardandoMov}>
              {guardandoMov
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.movConfirmarText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CONTENIDO */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {parte.foto ? (
          <>
            <Text style={styles.seccion}>📷 FOTO DE REFERENCIA</Text>
            <Image source={{ uri: String(parte.foto) }} style={styles.foto} resizeMode="cover" />
          </>
        ) : null}

        <Text style={styles.seccion}>📍 UBICACIÓN</Text>
        <View style={styles.ubicBox}>
          <Text style={styles.ubicText}>{parte.ubicacion || '—'}</Text>
        </View>

        <Text style={styles.seccion}>ℹ️ INFORMACIÓN</Text>
        <View style={styles.infoBox}>
          <InfoRow label="Fabricante"           value={parte.fabricante} />
          <InfoRow label="Código / N° de parte" value={parte.codigo} />
          <InfoRow label="Descripción"          value={parte.descripcion} />
          <InfoRow label="Número de serie"      value={parte.numeroSerie} />
          <InfoRow label="Registrada por"       value={extractNombre(parte.creadoPor)} />
          <InfoRow label="Registrada"           value={formatFecha(parte.creadoEn)} />
          <InfoRow label="Actualizada"          value={formatFecha(parte.actualizadoEn)} />
          <InfoRow label="Actualizada por"      value={extractNombre(parte.actualizadoPor)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  volver: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editarBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editarText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  eliminarBtn: { padding: 6 },
  eliminarConfirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  eliminarSiBtn: { backgroundColor: '#C62828', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  eliminarSiText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  eliminarNoText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  nombre: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 14 },
  existenciaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  existenciaCard: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  existenciaCardRed: { backgroundColor: 'rgba(244,67,54,0.25)' },
  existenciaNum: { fontSize: 32, fontWeight: '900', color: '#fff' },
  existenciaLabel: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginLeft: 6 },
  movBtns: { flexDirection: 'row', gap: 8 },
  movBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  entradaBtn: { backgroundColor: 'rgba(76,175,80,0.25)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.5)' },
  salidaBtn: { backgroundColor: 'rgba(244,67,54,0.2)', borderWidth: 1, borderColor: 'rgba(244,67,54,0.4)' },
  movBtnActive: { opacity: 0.6 },
  movBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Panel movimiento
  movPanel: { padding: 16, borderBottomWidth: 1 },
  movPanelEntrada: { backgroundColor: '#E8F5E9', borderBottomColor: '#A5D6A7' },
  movPanelSalida: { backgroundColor: '#FFEBEE', borderBottomColor: '#EF9A9A' },
  movPanelTitulo: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  movPanelRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  movCantidadBox: { width: 80 },
  movCantidadLabel: { fontSize: 11, fontWeight: '700', color: '#666', marginBottom: 4 },
  movCantidadInput: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 18, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  movNotaInput: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  movPanelBtns: { flexDirection: 'row', gap: 10 },
  movCancelarBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  movCancelarText: { color: '#555', fontWeight: '700' },
  movConfirmarBtn: { flex: 2, borderRadius: 10, padding: 12, alignItems: 'center' },
  movConfirmarEntrada: { backgroundColor: '#2E7D32' },
  movConfirmarSalida: { backgroundColor: '#C62828' },
  movConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Contenido
  seccion: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 10, marginTop: 18 },
  foto: { width: '100%', height: 220, borderRadius: 14, marginBottom: 4, backgroundColor: '#e0e0e0' },
  ubicBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  ubicText: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  infoBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  infoLabel: { fontSize: 14, color: '#666', flex: 1 },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', maxWidth: '55%', textAlign: 'right' },
});
