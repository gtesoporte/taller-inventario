import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirEquipos, suscribirFabricantes } from '../config/firestore';

export default function EquiposScreen({ navigation }) {
  const [equipos, setEquipos] = useState([]);
  const [fabricantes, setFabricantes] = useState(['Todos']);
  const [filtro, setFiltro] = useState('');
  const [fabricante, setFabricante] = useState('Todos');
  const [clasificacion, setClasificacion] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFab = suscribirFabricantes(lista => setFabricantes(['Todos', ...lista]));
    const unsubEq = suscribirEquipos((data) => { setEquipos(data); setLoading(false); });
    return () => { unsubFab(); unsubEq(); };
  }, []);

  const CLASIF_MAP = {
    hueso: { label: '💀 Hueso', color: '#E53935' },
    reacondicionamiento: { label: '🔧 Reacondicionamiento', color: '#1565C0' },
    prestamo: { label: '🤝 Préstamo', color: '#2E7D32' },
  };

  const equiposFiltrados = equipos.filter(e => {
    const q = filtro.toLowerCase();
    const matchTexto = !filtro
      || e.modelo?.toLowerCase().includes(q)
      || e.numeroSerie?.toLowerCase().includes(q)
      || e.fabricante?.toLowerCase().includes(q);
    const matchFab = fabricante === 'Todos'
      ? true
      : fabricante === 'Sin fabricante'
        ? !e.fabricante || e.fabricante.trim() === ''
        : e.fabricante?.toUpperCase() === fabricante;
    const matchClasif = !clasificacion || e.clasificacion === clasificacion;
    return matchTexto && matchFab && matchClasif;
  });

  const grupos = equiposFiltrados.reduce((acc, e) => {
    const fab = e.fabricante?.toUpperCase() || 'SIN FABRICANTE';
    if (!acc[fab]) acc[fab] = [];
    acc[fab].push(e);
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
            <Text style={styles.headerSub}>{equipos.length} equipos registrados</Text>
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
          <TouchableOpacity style={styles.invTab} onPress={() => navigation.replace('PartesLista')}>
            <Text style={styles.invTabText}>📦 Refacciones</Text>
          </TouchableOpacity>
          <View style={[styles.invTab, styles.invTabActive]}>
            <Text style={[styles.invTabText, styles.invTabTextActive]}>🖥️ Equipos</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.nuevaBtn} onPress={() => navigation.navigate('FormEquipo')}>
        <Text style={styles.nuevaBtnText}>+ Nuevo equipo</Text>
      </TouchableOpacity>

      {/* Buscador */}
      <TextInput
        style={styles.search}
        placeholder="🔍  Buscar por modelo, fabricante o N° de serie..."
        placeholderTextColor="#aaa"
        value={filtro}
        onChangeText={setFiltro}
      />

      {/* Chips de clasificación */}
      <View style={styles.chipsContainer}>
        {Object.entries(CLASIF_MAP).map(([id, { label, color }]) => (
          <TouchableOpacity
            key={id}
            style={[styles.chip, clasificacion === id && { backgroundColor: color, borderColor: color }]}
            onPress={() => setClasificacion(prev => prev === id ? '' : id)}
          >
            <Text style={[styles.chipText, clasificacion === id && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chips de fabricante */}
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
            {items.map(equipo => (
              <TouchableOpacity
                key={equipo.id}
                style={styles.card}
                onPress={() => navigation.navigate('DetalleEquipo', { id: equipo.id })}
              >
                {equipo.foto
                  ? <Image source={{ uri: equipo.foto }} style={styles.thumb} resizeMode="cover" />
                  : <View style={[styles.thumb, styles.thumbPlaceholder]}><Text style={{ fontSize: 28 }}>🖥️</Text></View>
                }
                <View style={styles.cardBody}>
                  <Text style={styles.cardNombre}>{equipo.modelo}</Text>
                  {equipo.numeroSerie
                    ? <Text style={styles.cardSerie}>N/S: {equipo.numeroSerie}</Text>
                    : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                    {equipo.fabricante
                      ? <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{equipo.fabricante.toUpperCase()}</Text></View>
                      : null}
                    {equipo.clasificacion && CLASIF_MAP[equipo.clasificacion] && (
                      <View style={[styles.fabBadge, { backgroundColor: CLASIF_MAP[equipo.clasificacion].color }]}>
                        <Text style={styles.fabBadgeText}>{CLASIF_MAP[equipo.clasificacion].label}</Text>
                      </View>
                    )}
                    {equipo.estadoSalida && (
                      <View style={[styles.fabBadge, { backgroundColor: equipo.estadoSalida === 'desecho' ? '#616161' : '#00838F' }]}>
                        <Text style={styles.fabBadgeText}>{equipo.estadoSalida === 'desecho' ? '🗑️ Desecho' : '📦 Almacén'}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filtro || fabricante !== 'Todos' ? 'Sin resultados.' : 'No hay equipos registrados.'}
          </Text>
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
  headerBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  invTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, marginTop: 14 },
  invTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  invTabActive: { backgroundColor: '#fff' },
  invTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  invTabTextActive: { color: AZUL },
  nuevaBtn: { backgroundColor: '#1565C0', margin: 14, marginBottom: 10, borderRadius: 12, padding: 14, alignItems: 'center' },
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
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 10, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  thumb: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardSerie: { fontSize: 12, color: '#666', marginTop: 2 },
  fabBadge: { backgroundColor: AZUL, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
