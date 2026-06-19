import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { suscribirMovimientos } from '../config/firestore';

function formatFecha(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MovimientosScreen({ navigation }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = suscribirMovimientos((data) => { setMovimientos(data); setLoading(false); });
    return unsub;
  }, []);

  const entradas = movimientos.filter(m => m.tipo === 'entrada').length;
  const salidas = movimientos.filter(m => m.tipo === 'salida').length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Movimientos</Text>
        <View style={styles.sumRow}>
          <View style={styles.sumChip}>
            <Text style={styles.sumNum}>{entradas}</Text>
            <Text style={styles.sumLabel}>▲ Entradas</Text>
          </View>
          <View style={styles.sumChip}>
            <Text style={[styles.sumNum, { color: '#FF6B6B' }]}>{salidas}</Text>
            <Text style={styles.sumLabel}>▼ Salidas</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={movimientos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const esEntrada = item.tipo === 'entrada';
          return (
            <View style={[styles.card, { borderLeftColor: esEntrada ? '#4CAF50' : '#F44336' }]}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNombre}>{item.nombreParte || 'Refacción'}</Text>
                  <Text style={styles.cardFecha}>{formatFecha(item.creadoEn)}</Text>
                  {item.usuario ? <Text style={styles.cardUsuario}>👤 {item.usuario}</Text> : null}
                </View>
                <Text style={[styles.cardCantidad, { color: esEntrada ? '#4CAF50' : '#F44336' }]}>
                  {esEntrada ? '+' : '-'}{item.cantidad} pzas
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No hay movimientos registrados.</Text>}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FormMovimiento')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  sumNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sumLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardFecha: { fontSize: 11, color: '#aaa', marginTop: 3 },
  cardUsuario: { fontSize: 12, color: '#666', marginTop: 3 },
  cardCantidad: { fontSize: 18, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1565C0', width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
