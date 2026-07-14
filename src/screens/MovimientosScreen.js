import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirMovimientos, deleteMovimiento } from '../config/firestore';
import { useAuth } from '../context/AuthContext';

function formatFecha(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

// Normaliza tipo para soportar registros antiguos con capitalización distinta
const normTipo = (tipo) => (tipo || '').toLowerCase().trim();

export default function MovimientosScreen() {
  const { perfil } = useAuth();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // id del movimiento a eliminar
  const [eliminando, setEliminando] = useState(false);

  const esSuper = (perfil?.rol || '').toLowerCase().includes('super');

  useEffect(() => {
    const unsub = suscribirMovimientos(data => { setMovimientos(data); setLoading(false); });
    return unsub;
  }, []);

  const filtrados = movimientos.filter(m => {
    const tipo = normTipo(m.tipo);
    const matchTipo = filtroTipo === 'todos' || tipo === filtroTipo;
    const q = busqueda.toLowerCase();
    const matchBusq = !busqueda
      || (m.nombreParte || m.nombre || '').toLowerCase().includes(q)
      || (m.codigoParte || m.codigo || '').toLowerCase().includes(q)
      || (m.fabricante || '').toLowerCase().includes(q)
      || (m.ubicacion || '').toLowerCase().includes(q)
      || (m.usuario || '').toLowerCase().includes(q)
      || (m.nota || m.motivo || m.descripcion || '').toLowerCase().includes(q);
    return matchTipo && matchBusq;
  });

  const totalEntradas = movimientos
    .filter(m => normTipo(m.tipo) === 'entrada')
    .reduce((s, m) => s + (m.cantidad || 0), 0);
  const totalSalidas = movimientos
    .filter(m => normTipo(m.tipo) === 'salida')
    .reduce((s, m) => s + (m.cantidad || 0), 0);

  const handleEliminar = async (id) => {
    setEliminando(true);
    try {
      await deleteMovimiento(id);
      setConfirmDelete(null);
    } catch {}
    setEliminando(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Movimientos</Text>
        <View style={styles.sumRow}>
          <TouchableOpacity
            style={[styles.sumChip, filtroTipo === 'entrada' && styles.sumChipActive]}
            onPress={() => setFiltroTipo(filtroTipo === 'entrada' ? 'todos' : 'entrada')}
          >
            <Text style={styles.sumNum}>{totalEntradas}</Text>
            <Text style={styles.sumLabel}>▲ Entradas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sumChip, filtroTipo === 'salida' && styles.sumChipActive]}
            onPress={() => setFiltroTipo(filtroTipo === 'salida' ? 'todos' : 'salida')}
          >
            <Text style={[styles.sumNum, { color: '#FF6B6B' }]}>{totalSalidas}</Text>
            <Text style={styles.sumLabel}>▼ Salidas</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="🔍  Buscar por refacción, usuario, nota..."
        placeholderTextColor="#aaa"
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <FlatList
        data={filtrados}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const tipo = normTipo(item.tipo);
          const esEntrada = tipo === 'entrada';
          const nombreParte = item.nombreParte || item.nombre || '—';
          const codigo = item.codigoParte || item.codigo || null;
          const nota = item.nota || item.motivo || item.descripcion || null;
          const estaConfirmando = confirmDelete === item.id;

          return (
            <View style={[styles.card, { borderLeftColor: esEntrada ? '#4CAF50' : '#F44336' }]}>
              {/* Fila superior: badge tipo + cantidad + (botón eliminar superadmin) */}
              <View style={styles.cardTop}>
                <View style={[styles.tipoBadge, esEntrada ? styles.tipoBadgeEntrada : styles.tipoBadgeSalida]}>
                  <Text style={[styles.tipoBadgeText, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                    {esEntrada ? '▲ ENTRADA' : '▼ SALIDA'}
                  </Text>
                </View>
                <View style={styles.cardTopRight}>
                  <Text style={[styles.cardCantidad, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                    {esEntrada ? '+' : '-'}{item.cantidad} pz
                  </Text>
                  {esSuper && !estaConfirmando && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setConfirmDelete(item.id)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Nombre refacción */}
              <Text style={styles.cardNombre}>{nombreParte}</Text>

              {/* Código y fabricante */}
              {(codigo || item.fabricante) ? (
                <Text style={styles.cardCodigo}>
                  {[codigo, item.fabricante].filter(Boolean).join(' · ')}
                </Text>
              ) : null}

              {/* Ubicación y usuario */}
              <View style={styles.metaRow}>
                {item.ubicacion ? <Text style={styles.metaItem}>📍 {item.ubicacion}</Text> : null}
                {item.usuario ? <Text style={styles.metaItem}>👤 {item.usuario}</Text> : null}
              </View>

              {/* Flujo de existencia */}
              {item.existenciaAnterior !== undefined && item.existenciaAnterior !== null ? (
                <Text style={styles.existenciaFlow}>
                  Existencia: {item.existenciaAnterior} → {item.existenciaNueva}
                </Text>
              ) : null}

              {/* Nota */}
              {nota ? (
                <Text style={styles.nota}>💬 {nota}</Text>
              ) : null}

              {/* Fecha */}
              <Text style={styles.fecha}>{formatFecha(item.creadoEn)}</Text>

              {/* Confirmación eliminar (superadmin) */}
              {estaConfirmando && (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.deleteConfirmLabel}>¿Eliminar este movimiento?</Text>
                  <View style={styles.deleteConfirmBtns}>
                    <TouchableOpacity
                      style={styles.deleteConfirmNo}
                      onPress={() => setConfirmDelete(null)}
                      disabled={eliminando}
                    >
                      <Text style={styles.deleteConfirmNoText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConfirmSi}
                      onPress={() => handleEliminar(item.id)}
                      disabled={eliminando}
                    >
                      {eliminando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.deleteConfirmSiText}>Eliminar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {busqueda || filtroTipo !== 'todos' ? 'Sin resultados.' : 'No hay movimientos registrados.'}
          </Text>
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
      />
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16 },
  sumRow: { flexDirection: 'row', gap: 10 },
  sumChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sumChipActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  sumNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sumLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  search: { margin: 14, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeEntrada: { backgroundColor: '#E8F5E9' },
  tipoBadgeSalida: { backgroundColor: '#FFEBEE' },
  tipoBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardCantidad: { fontSize: 20, fontWeight: '900' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardCodigo: { fontSize: 12, color: '#888', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  metaItem: { fontSize: 12, color: '#666' },
  existenciaFlow: { fontSize: 12, color: '#1976D2', fontWeight: '600', marginTop: 4 },
  nota: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6, backgroundColor: '#F5F6FA', borderRadius: 8, padding: 8 },
  fecha: { fontSize: 11, color: '#bbb', marginTop: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  deleteConfirm: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  deleteConfirmLabel: { fontSize: 13, color: '#C62828', fontWeight: '700', marginBottom: 8 },
  deleteConfirmBtns: { flexDirection: 'row', gap: 8 },
  deleteConfirmNo: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  deleteConfirmNoText: { color: '#555', fontWeight: '700' },
  deleteConfirmSi: { flex: 1, backgroundColor: '#C62828', borderRadius: 8, padding: 10, alignItems: 'center' },
  deleteConfirmSiText: { color: '#fff', fontWeight: '700' },
});
