import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { suscribirMovimientos } from '../config/firestore';

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

export default function MovimientosScreen() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsub = suscribirMovimientos(data => { setMovimientos(data); setLoading(false); });
    return unsub;
  }, []);

  const filtrados = movimientos.filter(m => {
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    const q = busqueda.toLowerCase();
    const matchBusq = !busqueda
      || m.nombreParte?.toLowerCase().includes(q)
      || m.codigoParte?.toLowerCase().includes(q)
      || m.fabricante?.toLowerCase().includes(q)
      || m.ubicacion?.toLowerCase().includes(q)
      || m.usuario?.toLowerCase().includes(q)
      || m.nota?.toLowerCase().includes(q);
    return matchTipo && matchBusq;
  });

  const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.cantidad || 0), 0);
  const totalSalidas  = movimientos.filter(m => m.tipo === 'salida').reduce((s, m) => s + (m.cantidad || 0), 0);

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
          const esEntrada = item.tipo === 'entrada';
          return (
            <View style={[styles.card, { borderLeftColor: esEntrada ? '#4CAF50' : '#F44336' }]}>
              {/* Fila principal */}
              <View style={styles.cardTop}>
                <View style={[styles.tipoBadge, esEntrada ? styles.tipoBadgeEntrada : styles.tipoBadgeSalida]}>
                  <Text style={styles.tipoBadgeText}>{esEntrada ? '▲ ENTRADA' : '▼ SALIDA'}</Text>
                </View>
                <Text style={[styles.cardCantidad, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                  {esEntrada ? '+' : '-'}{item.cantidad} pz
                </Text>
              </View>

              {/* Nombre y código */}
              <Text style={styles.cardNombre}>{item.nombreParte || '—'}</Text>
              {(item.codigoParte || item.fabricante) && (
                <Text style={styles.cardCodigo}>
                  {[item.codigoParte, item.fabricante].filter(Boolean).join(' · ')}
                </Text>
              )}

              {/* Meta */}
              <View style={styles.metaRow}>
                {item.ubicacion && <Text style={styles.metaItem}>📍 {item.ubicacion}</Text>}
                {item.usuario && <Text style={styles.metaItem}>👤 {item.usuario}</Text>}
              </View>

              {/* Existencia antes → después */}
              {item.existenciaAnterior !== undefined && (
                <Text style={styles.existenciaFlow}>
                  Existencia: {item.existenciaAnterior} → {item.existenciaNueva}
                </Text>
              )}

              {/* Nota */}
              {item.nota && (
                <Text style={styles.nota}>💬 {item.nota}</Text>
              )}

              {/* Fecha */}
              <Text style={styles.fecha}>{formatFecha(item.creadoEn)}</Text>
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
  tipoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeEntrada: { backgroundColor: '#E8F5E9' },
  tipoBadgeSalida: { backgroundColor: '#FFEBEE' },
  tipoBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardCantidad: { fontSize: 20, fontWeight: '900' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardCodigo: { fontSize: 12, color: '#888', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  metaItem: { fontSize: 12, color: '#666' },
  existenciaFlow: { fontSize: 12, color: '#1976D2', fontWeight: '600', marginTop: 4 },
  nota: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6, backgroundColor: '#F5F6FA', borderRadius: 8, padding: 8 },
  fecha: { fontSize: 11, color: '#bbb', marginTop: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
