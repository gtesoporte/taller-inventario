import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirPartes, suscribirFabricantes } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

export default function PartesScreen({ navigation }) {
  const { perfil } = useAuth();
  const [partes, setPartes] = useState([]);
  const [fabricantes, setFabricantes] = useState(['Todos']);
  const [filtro, setFiltro] = useState('');
  const [fabricante, setFabricante] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFab = suscribirFabricantes(lista => setFabricantes(['Todos', ...lista]));
    const unsubPartes = suscribirPartes((data) => { setPartes(data); setLoading(false); });
    return () => { unsubFab(); unsubPartes(); };
  }, []);

  const partesFiltradas = partes.filter(p => {
    const q = filtro.toLowerCase();
    const matchTexto = !filtro || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.ubicacion?.toLowerCase().includes(q);
    const matchFab = fabricante === 'Todos'
      ? true
      : fabricante === 'Sin fabricante'
        ? !p.fabricante || p.fabricante.trim() === ''
        : p.fabricante?.toUpperCase() === fabricante;
    return matchTexto && matchFab;
  });

  const grupos = partesFiltradas.reduce((acc, p) => {
    const fab = p.fabricante?.toUpperCase() || 'SIN FABRICANTE';
    if (!acc[fab]) acc[fab] = [];
    acc[fab].push(p);
    return acc;
  }, {});

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>🔧 Taller Soporte</Text>
            <Text style={styles.headerSub}>{partes.length} refacciones registradas</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EscanearQR')}>
              <Text>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Ubicaciones')}>
              <Text>📱</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('BusquedaVoz')}>
              <Text>🎙️</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Tab toggle */}
        <View style={styles.invTabs}>
          <View style={[styles.invTab, styles.invTabActive]}>
            <Text style={[styles.invTabText, styles.invTabTextActive]}>📦 Refacciones</Text>
          </View>
          <TouchableOpacity style={styles.invTab} onPress={() => navigation.replace('EquiposLista')}>
            <Text style={styles.invTabText}>🖥️ Equipos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {esAdmin(perfil) && (
        <TouchableOpacity style={styles.nuevaBtn} onPress={() => navigation.navigate('FormParte')}>
          <Text style={styles.nuevaBtnText}>+ Nueva refacción</Text>
        </TouchableOpacity>
      )}

      {/* Buscador */}
      <TextInput
        style={styles.search}
        placeholder="🔍  Buscar por nombre, código o ubicación..."
        placeholderTextColor="#aaa"
        value={filtro}
        onChangeText={setFiltro}
      />

      {/* Chips de fabricante — wrapped para web */}
      <View style={styles.chipsContainer}>
        {fabricantes.map(fab => (
          <TouchableOpacity
            key={fab}
            style={[styles.chip, fabricante === fab && styles.chipActive]}
            onPress={() => setFabricante(fab)}
          >
            <Text style={[styles.chipText, fabricante === fab && styles.chipTextActive]}>{fab}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          key="sin-fabricante"
          style={[styles.chip, styles.chipSinFab, fabricante === 'Sin fabricante' && styles.chipActive]}
          onPress={() => setFabricante(fabricante === 'Sin fabricante' ? 'Todos' : 'Sin fabricante')}
        >
          <Text style={[styles.chipText, fabricante === 'Sin fabricante' && styles.chipTextActive]}>Sin fabricante</Text>
        </TouchableOpacity>
      </View>

      {/* Lista agrupada */}
      <FlatList
        data={Object.entries(grupos)}
        keyExtractor={([fab]) => fab}
        renderItem={({ item: [fab, items] }) => (
          <View>
            <View style={styles.grupoHeader}>
              <Text style={styles.grupoNombre}>{fab}</Text>
              <View style={styles.grupoBadge}><Text style={styles.grupoBadgeText}>{items.length}</Text></View>
            </View>
            {items.map(parte => (
              <TouchableOpacity key={parte.id} style={styles.card} onPress={() => navigation.navigate('DetalleParte', { id: parte.id })}>
                {parte.foto
                  ? <Image source={{ uri: parte.foto }} style={styles.thumb} />
                  : <View style={[styles.thumb, styles.thumbPlaceholder]}><Text style={{ fontSize: 22 }}>📦</Text></View>
                }
                <View style={styles.cardBody}>
                  <Text style={styles.cardNombre}>{parte.nombre}</Text>
                  {parte.codigo ? <Text style={styles.cardCodigo}>{parte.codigo}</Text> : null}
                  <View style={styles.cardRow}>
                    {parte.ubicacion ? <Text style={styles.cardUbic}>📍 {parte.ubicacion}</Text> : null}
                    {parte.fabricante
                      ? <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{parte.fabricante.toUpperCase()}</Text></View>
                      : null
                    }
                  </View>
                </View>
                <View style={[styles.cantBadge, (parte.existencia ?? parte.existenciaActual ?? parte.cantidad ?? 0) <= 0 && styles.cantBadgeRed]}>
                  <Text style={styles.cantNum}>{parte.existencia ?? parte.existenciaActual ?? parte.cantidad ?? 0}</Text>
                  <Text style={styles.cantLabel}>pzas</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{filtro ? 'Sin resultados.' : 'No hay refacciones registradas.'}</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, marginTop: 14 },
  invTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  invTabActive: { backgroundColor: '#fff' },
  invTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  invTabTextActive: { color: AZUL },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  nuevaBtn: { backgroundColor: '#1976D2', margin: 14, marginBottom: 10, borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  search: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipSinFab: { borderStyle: 'dashed', borderColor: '#bbb' },
  chipActive: { backgroundColor: AZUL, borderColor: AZUL },
  chipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  grupoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6 },
  grupoNombre: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5 },
  grupoBadge: { backgroundColor: AZUL, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  grupoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 10, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  thumb: { width: 60, height: 60, borderRadius: 10, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardCodigo: { fontSize: 12, color: '#666', marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  cardUbic: { fontSize: 11, color: '#888' },
  fabBadge: { backgroundColor: AZUL, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48 },
  cantBadgeRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 18, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 10, color: '#888' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
