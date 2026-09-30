import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Wrench, Camera, MapPin, Mic, Package, Monitor, Skull, Handshake, Trash2, CheckCircle2, Hourglass, ClipboardCheck, XCircle } from 'lucide-react-native';
import Text from '../components/UpperText';
import SearchInput from '../components/SearchInput';
import { suscribirEquipos, suscribirFabricantes, getUbicaciones } from '../config/firestore';
import Dropdown from '../components/Dropdown';

export default function EquiposScreen({ navigation, route }) {
  const area = route?.params?.area || 'ingenieria';
  const esValidacion = area === 'validacion';

  const [equipos, setEquipos] = useState([]);
  const [fabricantes, setFabricantes] = useState(['Todos']);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [fabricante, setFabricante] = useState('Todos');
  const [clasificacion, setClasificacion] = useState('');
  const [ubicacion, setUbicacion] = useState('Todas');
  const [revision, setRevision] = useState('todas');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFab = suscribirFabricantes(lista => setFabricantes(['Todos', ...lista]));
    const unsubEq = suscribirEquipos((data) => { setEquipos(data); setLoading(false); });
    getUbicaciones().then(lista => setUbicaciones(lista.map(u => u.nombre).filter(Boolean))).catch(() => {});
    return () => { unsubFab(); unsubEq(); };
  }, []);

  const CLASIF_MAP = {
    hueso: { label: 'Hueso', icon: Skull, color: '#E53935' },
    reacondicionamiento: { label: 'Reacondicionamiento', icon: Wrench, color: '#1565C0' },
    prestamo: { label: 'Préstamo', icon: Handshake, color: '#2E7D32' },
  };

  const equiposDelArea = equipos.filter(e => e.area === area || !e.area);

  const equiposFiltrados = equiposDelArea.filter(e => {
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
    const matchUbic = ubicacion === 'Todas'
      ? true
      : ubicacion === 'Sin ubicación'
        ? !e.ubicacion
        : e.ubicacion === ubicacion;
    const matchRev = revision === 'todas'
      ? true
      : revision === 'revisada'
        ? e.estadoRevision === 'revisada'
        : e.estadoRevision !== 'revisada';
    return matchTexto && matchFab && matchClasif && matchUbic && matchRev;
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
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerTitleRow}>
              {esValidacion ? <ClipboardCheck size={18} color="#fff" /> : <Wrench size={18} color="#fff" />}
              <Text style={styles.headerTitle}>{esValidacion ? 'Equipos Validación' : 'Equipos Ingeniería'}</Text>
            </View>
            <Text style={styles.headerSub}>{equiposDelArea.length} equipos registrados</Text>
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
          <TouchableOpacity style={[styles.invTab, styles.invTabRow]} onPress={() => navigation.replace('PartesLista')}>
            <Package size={13} color="rgba(255,255,255,0.65)" />
            <Text style={styles.invTabText}>Refacciones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.invTab, styles.invTabRow, !esValidacion && styles.invTabActive]}
            onPress={() => navigation.replace('EquiposIngenieria')}
          >
            <Wrench size={13} color={!esValidacion ? AZUL : 'rgba(255,255,255,0.65)'} />
            <Text style={[styles.invTabText, !esValidacion && styles.invTabTextActive]}>Ing.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.invTab, styles.invTabRow, esValidacion && styles.invTabActive]}
            onPress={() => navigation.replace('EquiposValidacion')}
          >
            <ClipboardCheck size={13} color={esValidacion ? AZUL : 'rgba(255,255,255,0.65)'} />
            <Text style={[styles.invTabText, esValidacion && styles.invTabTextActive]}>Val.</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.nuevaBtn} onPress={() => navigation.navigate('FormEquipo', { areaPreseleccionada: area })}>
        <Text style={styles.nuevaBtnText}>+ Nuevo equipo</Text>
      </TouchableOpacity>

      {/* Buscador */}
      <SearchInput
        style={styles.search}
        placeholder="Buscar por modelo, fabricante o N° de serie..."
        value={filtro}
        onChangeText={setFiltro}
      />

      {/* Filtros: marca y revisión */}
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

      {/* Filtros: clasificación y ubicación */}
      <View style={styles.filtrosRow}>
        <Dropdown
          style={styles.filtroDropdown}
          value={clasificacion}
          titulo="FILTRAR POR CLASIFICACIÓN"
          label="Clasificación"
          placeholder="Todas"
          opciones={[
            { value: '', label: 'Todas las clasificaciones' },
            ...Object.entries(CLASIF_MAP).map(([id, { label }]) => ({ value: id, label })),
          ]}
          onChange={setClasificacion}
        />
        <Dropdown
          style={styles.filtroDropdown}
          value={ubicacion}
          titulo="FILTRAR POR UBICACIÓN"
          label="Ubicación"
          opciones={['Todas', 'Sin ubicación', ...ubicaciones]}
          onChange={setUbicacion}
        />
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
                  : <View style={[styles.thumb, styles.thumbPlaceholder]}><Monitor size={26} color="#bbb" /></View>
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
                      <View style={[styles.fabBadge, styles.fabBadgeRow, { backgroundColor: CLASIF_MAP[equipo.clasificacion].color }]}>
                        {React.createElement(CLASIF_MAP[equipo.clasificacion].icon, { size: 11, color: '#fff' })}
                        <Text style={styles.fabBadgeText}>{CLASIF_MAP[equipo.clasificacion].label}</Text>
                      </View>
                    )}
                    {equipo.estadoSalida && (
                      <View style={[styles.fabBadge, styles.fabBadgeRow, { backgroundColor: equipo.estadoSalida === 'desecho' ? '#616161' : '#00838F' }]}>
                        {equipo.estadoSalida === 'desecho' ? <Trash2 size={11} color="#fff" /> : <Package size={11} color="#fff" />}
                        <Text style={styles.fabBadgeText}>{equipo.estadoSalida === 'desecho' ? 'Desecho' : 'Almacén'}</Text>
                      </View>
                    )}
                    {equipo.estadoRevision === 'revisada'
                      ? <View style={[styles.revBadge, styles.revBadgeOk, styles.fabBadgeRow]}><CheckCircle2 size={11} color="#2E7D32" /><Text style={[styles.revBadgeText, { color: '#2E7D32' }]}>Revisado</Text></View>
                      : <View style={[styles.revBadge, styles.revBadgePend, styles.fabBadgeRow]}><Hourglass size={11} color="#E65100" /><Text style={[styles.revBadgeText, { color: '#E65100' }]}>Pendiente</Text></View>
                    }
                    {esValidacion && (
                      equipo.estadoValidacion === 'validado'
                        ? <View style={[styles.revBadge, styles.revBadgeOk, styles.fabBadgeRow]}><CheckCircle2 size={11} color="#2E7D32" /><Text style={[styles.revBadgeText, { color: '#2E7D32' }]}>Validado</Text></View>
                        : <View style={[styles.revBadge, styles.revBadgeNoValidado, styles.fabBadgeRow]}><XCircle size={11} color="#C62828" /><Text style={[styles.revBadgeText, { color: '#C62828' }]}>No validado</Text></View>
                    )}
                    {!equipo.area && (
                      <View style={[styles.revBadge, styles.revBadgeSinArea, styles.fabBadgeRow]}>
                        <Text style={[styles.revBadgeText, { color: '#616161' }]}>Sin clasificar</Text>
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

const AZUL = '#085686'; // DISA blue
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  headerTitleBlock: { flex: 1, flexShrink: 1 },
  headerBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  invTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, marginTop: 14, gap: 3 },
  invTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  invTabRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  invTabActive: { backgroundColor: '#fff' },
  invTabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  invTabTextActive: { color: AZUL },
  nuevaBtn: { backgroundColor: '#1565C0', margin: 14, marginBottom: 10, borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  search: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  filtrosRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginBottom: 12 },
  filtroDropdown: { flex: 1 },
  revBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  revBadgeOk: { backgroundColor: '#E8F5E9' },
  revBadgePend: { backgroundColor: '#FFF3E0' },
  revBadgeNoValidado: { backgroundColor: '#FFEBEE' },
  revBadgeSinArea: { backgroundColor: '#EEEEEE' },
  revBadgeText: { fontSize: 10, fontWeight: '700' },
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
  fabBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
