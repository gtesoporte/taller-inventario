import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Menu, Wrench, Camera, MapPin, Mic, Package, Monitor, AlertTriangle, CheckCircle2, Hourglass } from 'lucide-react-native';
import Text from '../components/UpperText';
import SearchInput from '../components/SearchInput';
import { suscribirPartes, suscribirFabricantes, getUbicaciones } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';
import DrawerMenu from '../components/DrawerMenu';
import Dropdown from '../components/Dropdown';

export default function PartesScreen({ navigation }) {
  const { perfil } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [partes, setPartes] = useState([]);
  const [fabricantes, setFabricantes] = useState(['Todos']);
  const [filtro, setFiltro] = useState('');
  const [fabricante, setFabricante] = useState('Todos');
  const [revision, setRevision] = useState('todas');
  const [ubicacion, setUbicacion] = useState('Todas');
  const [ubicacionesRegistradas, setUbicacionesRegistradas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFab = suscribirFabricantes(lista => setFabricantes(['Todos', ...lista]));
    const unsubPartes = suscribirPartes((data) => { setPartes(data); setLoading(false); });
    getUbicaciones().then(setUbicacionesRegistradas).catch(() => {});
    return () => { unsubFab(); unsubPartes(); };
  }, []);

  // Todas las ubicaciones posibles: las registradas en Ubicaciones + las que
  // alguna refacción trae escritas a mano (así no "desaparecen" del filtro
  // aunque nunca se hayan dado de alta formalmente).
  const ubicacionesDisponibles = [...new Set([
    ...ubicacionesRegistradas.map(u => u.nombre).filter(Boolean),
    ...partes.map(p => p.ubicacion).filter(Boolean),
  ])].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  const ubicacionesSinRegistrar = ubicacionesDisponibles.filter(
    u => !ubicacionesRegistradas.some(r => r.nombre === u)
  );

  const partesFiltradas = partes.filter(p => {
    const q = filtro.toLowerCase();
    const matchTexto = !filtro || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.ubicacion?.toLowerCase().includes(q);
    const matchFab = fabricante === 'Todos'
      ? true
      : fabricante === 'Sin fabricante'
        ? !p.fabricante || p.fabricante.trim() === ''
        : p.fabricante?.toUpperCase() === fabricante;
    const matchRev = revision === 'todas'
      ? true
      : revision === 'revisada'
        ? p.estadoRevision === 'revisada'
        : p.estadoRevision !== 'revisada';
    const matchUbic = ubicacion === 'Todas'
      ? true
      : ubicacion === 'Sin ubicación'
        ? !p.ubicacion
        : p.ubicacion === ubicacion;
    return matchTexto && matchFab && matchRev && matchUbic;
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
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuAbierto(true)}>
            <Menu size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerTitleRow}>
              <Wrench size={18} color="#fff" />
              <Text style={styles.headerTitle}>Taller Soporte</Text>
            </View>
            <Text style={styles.headerSub}>{partes.length} refacciones registradas</Text>
          </View>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EscanearQR')}>
            <Camera size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Ubicaciones')}>
            <MapPin size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('BusquedaVoz')}>
            <Mic size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Tab toggle */}
        <View style={styles.invTabs}>
          <View style={[styles.invTab, styles.invTabActive, styles.invTabRow]}>
            <Package size={14} color={AZUL} />
            <Text style={[styles.invTabText, styles.invTabTextActive]}>Refacciones</Text>
          </View>
          <TouchableOpacity style={[styles.invTab, styles.invTabRow]} onPress={() => navigation.replace('EquiposLista')}>
            <Monitor size={14} color="rgba(255,255,255,0.65)" />
            <Text style={styles.invTabText}>Equipos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {esAdmin(perfil) && (
        <TouchableOpacity style={styles.nuevaBtn} onPress={() => navigation.navigate('FormParte')}>
          <Text style={styles.nuevaBtnText}>+ Nueva refacción</Text>
        </TouchableOpacity>
      )}

      {/* Buscador */}
      <SearchInput
        style={styles.search}
        placeholder="Buscar por nombre, código o ubicación..."
        value={filtro}
        onChangeText={setFiltro}
      />

      {/* Filtros: marca y estado de revisión */}
      <View style={styles.filtrosRow}>
        <Dropdown
          style={styles.filtroDropdown}
          value={fabricante}
          titulo="FILTRAR POR MARCA"
          label="Marca"
          opciones={[...fabricantes, 'Sin fabricante']}
          onChange={setFabricante}
        />
        <Dropdown
          style={styles.filtroDropdown}
          value={revision}
          titulo="FILTRAR POR REVISIÓN"
          label="Revisión"
          opciones={[
            { value: 'todas', label: 'Todas' },
            { value: 'pendiente', label: 'Pendientes de revisar' },
            { value: 'revisada', label: 'Revisadas' },
          ]}
          onChange={setRevision}
        />
      </View>

      <Dropdown
        style={styles.filtroUbicacion}
        value={ubicacion}
        titulo="FILTRAR POR UBICACIÓN"
        label="Ubicación"
        opciones={['Todas', 'Sin ubicación', ...ubicacionesDisponibles]}
        onChange={setUbicacion}
      />

      {ubicacionesSinRegistrar.length > 0 && (
        <TouchableOpacity style={[styles.avisoSinRegistrar, { flexDirection: 'row', gap: 8 }]} onPress={() => navigation.navigate('Ubicaciones')}>
          <AlertTriangle size={15} color="#E65100" style={{ marginTop: 1 }} />
          <Text style={[styles.avisoSinRegistrarText, { flex: 1 }]}>
            {ubicacionesSinRegistrar.length} ubicación{ubicacionesSinRegistrar.length !== 1 ? 'es' : ''} solo escrita{ubicacionesSinRegistrar.length !== 1 ? 's' : ''} en refacciones,
            sin registrar en Ubicaciones ({ubicacionesSinRegistrar.slice(0, 3).join(', ')}{ubicacionesSinRegistrar.length > 3 ? '…' : ''}). Toca para registrarlas.
          </Text>
        </TouchableOpacity>
      )}

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
                  : <View style={[styles.thumb, styles.thumbPlaceholder]}><Package size={22} color="#bbb" /></View>
                }
                <View style={styles.cardBody}>
                  <Text style={styles.cardNombre}>{parte.nombre}</Text>
                  {parte.codigo ? <Text style={styles.cardCodigo}>{parte.codigo}</Text> : null}
                  <View style={styles.cardRow}>
                    {parte.ubicacion ? (
                      <View style={styles.cardUbicRow}>
                        <MapPin size={11} color="#888" />
                        <Text style={styles.cardUbic}>{parte.ubicacion}</Text>
                      </View>
                    ) : null}
                    {parte.fabricante
                      ? <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{parte.fabricante.toUpperCase()}</Text></View>
                      : null
                    }
                    {parte.estadoRevision === 'revisada'
                      ? <View style={[styles.revBadge, styles.revBadgeOk, styles.revBadgeRow]}><CheckCircle2 size={11} color="#2E7D32" /><Text style={[styles.revBadgeText, { color: '#2E7D32' }]}>Revisada</Text></View>
                      : <View style={[styles.revBadge, styles.revBadgePend, styles.revBadgeRow]}><Hourglass size={11} color="#E65100" /><Text style={[styles.revBadgeText, { color: '#E65100' }]}>Pendiente</Text></View>
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

      <DrawerMenu visible={menuAbierto} onClose={() => setMenuAbierto(false)} />
    </View>
  );
}

const AZUL = '#085686'; // DISA blue
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerTitleBlock: { flex: 1, flexShrink: 1 },
  menuBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  invTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, marginTop: 14 },
  invTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  invTabRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  invTabActive: { backgroundColor: '#fff' },
  invTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  invTabTextActive: { color: AZUL },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  nuevaBtn: { backgroundColor: '#1976D2', margin: 14, marginBottom: 10, borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  search: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  filtrosRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginBottom: 10 },
  filtroDropdown: { flex: 1 },
  filtroUbicacion: { marginHorizontal: 14, marginBottom: 12 },
  avisoSinRegistrar: { backgroundColor: '#FFF3E0', borderRadius: 10, marginHorizontal: 14, marginBottom: 12, padding: 10, borderWidth: 1, borderColor: '#FFCC80' },
  avisoSinRegistrarText: { fontSize: 11, color: '#E65100', fontWeight: '600', lineHeight: 16 },
  revBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  revBadgeOk: { backgroundColor: '#E8F5E9' },
  revBadgePend: { backgroundColor: '#FFF3E0' },
  revBadgeText: { fontSize: 10, fontWeight: '700' },
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
  cardUbicRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardUbic: { fontSize: 11, color: '#888' },
  fabBadge: { backgroundColor: AZUL, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  revBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48 },
  cantBadgeRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 18, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 10, color: '#888' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
