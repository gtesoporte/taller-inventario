import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirAcondicionamientos } from '../config/firestore';

const FILTROS = ['Todos', 'Pendientes', 'En progreso', 'Completados'];
const ESTADO_MAP = { 'Pendientes': 'pendiente', 'En progreso': 'en_progreso', 'Completados': 'completado' };

const normalizeEstado = (e) => (e || '').toLowerCase().replace(/[\s_-]/g, '').replace('é', 'e');

const ESTADO_ESTILOS = {
  pendiente:   { bg: '#FFF3E0', text: '#E65100', label: '⏳ Pendiente' },
  en_progreso: { bg: '#F3F4F6', text: '#374151', label: '🔧 En progreso' },
  completado:  { bg: '#E8F5E9', text: '#2E7D32', label: '✅ Completado' },
};

function formatFecha(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AcondicionamientoScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = suscribirAcondicionamientos((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const filtrados = items.filter(item => {
    const q = filtro.toLowerCase();
    const matchTexto = !filtro || item.nombre?.toLowerCase().includes(q) || item.equipo?.toLowerCase().includes(q) || item.ingeniero?.toLowerCase().includes(q) || item.numeroSerie?.toLowerCase().includes(q);
    const estadoNorm = normalizeEstado(item.estado);
    const filtroNorm = normalizeEstado(ESTADO_MAP[estadoFiltro] || '');
    const matchEstado = estadoFiltro === 'Todos' || estadoNorm === filtroNorm || estadoNorm.includes(filtroNorm);
    return matchTexto && matchEstado;
  });

  const conteos = {
    Todos: items.length,
    Pendientes: items.filter(i => normalizeEstado(i.estado) === 'pendiente').length,
    'En progreso': items.filter(i => normalizeEstado(i.estado).includes('progres')).length,
    Completados: items.filter(i => normalizeEstado(i.estado).includes('complet')).length,
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔧🔨 Acondicionamientos</Text>
          <Text style={styles.headerSub}>{items.length} proyectos registrados</Text>
        </View>
        <TouchableOpacity style={styles.nuevoBtn} onPress={() => navigation.navigate('FormAcond')}>
          <Text style={styles.nuevoBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros de estado */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, estadoFiltro === f && styles.filtroBtnActive]}
            onPress={() => setEstadoFiltro(f)}
          >
            <Text style={[styles.filtroText, estadoFiltro === f && styles.filtroTextActive]}>
              {f}{conteos[f] ? ` (${conteos[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Buscador */}
      <TextInput
        style={styles.search}
        placeholder="🔍  Buscar por equipo, ingeniero, No. serie..."
        placeholderTextColor="#aaa"
        value={filtro}
        onChangeText={setFiltro}
      />

      <FlatList
        data={filtrados}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const estadoKey = Object.keys(ESTADO_ESTILOS).find(k => normalizeEstado(item.estado).includes(normalizeEstado(k))) || 'pendiente';
          const est = ESTADO_ESTILOS[estadoKey];
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DetalleAcond', { id: item.id })}>
              <View style={styles.cardInner}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardNombre}>{item.nombre}</Text>
                  {item.equipo ? <Text style={styles.cardEquipo}>⚙️ {item.equipo}</Text> : null}
                  {item.numeroSerie ? <Text style={styles.cardSerie}>N/S: {item.numeroSerie}</Text> : null}
                  <View style={styles.cardFooter}>
                    {item.ingeniero ? <Text style={styles.cardIng}>🧑‍🔧 {item.ingeniero}</Text> : null}
                    {item.creadoEn ? <Text style={styles.cardFecha}>{formatFecha(item.creadoEn)}</Text> : null}
                  </View>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: est.bg }]}>
                  <Text style={[styles.estadoText, { color: est.text }]}>{est.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{filtro ? 'Sin resultados.' : 'No hay acondicionamientos registrados.'}</Text>}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
      />

    </View>
  );
}

const PURPLE = '#6D28D9';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: PURPLE, padding: 18, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  nuevoBtn: { backgroundColor: '#F97316', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  nuevoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filtrosRow: { marginTop: 12, flexGrow: 0 },
  filtroBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filtroBtnActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  filtroText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filtroTextActive: { color: '#fff' },
  search: { margin: 14, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderLeftWidth: 4, borderLeftColor: PURPLE },
  cardInner: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: 10 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardEquipo: { fontSize: 13, color: '#1565C0', fontWeight: '600', marginBottom: 2 },
  cardSerie: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardIng: { fontSize: 12, color: '#555', flex: 1 },
  cardFecha: { fontSize: 12, color: '#999' },
  estadoBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  estadoText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
