import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import {
  getAcondicionamiento, updateAcondicionamiento,
  getProgreso, addProgreso,
} from '../config/firestore';
import { useAuth } from '../context/AuthContext';

const ESTADO_ESTILOS = {
  pendiente:   { bg: '#FFF3E0', text: '#E65100', label: '⏳ Pendiente' },
  en_progreso: { bg: '#F3F4F6', text: '#374151', label: '🔧 En progreso' },
  completado:  { bg: '#E8F5E9', text: '#2E7D32', label: '✅ Completado' },
};

function formatFecha(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DetalleAcondScreen({ route, navigation }) {
  const { id } = route.params;
  const { perfil } = useAuth();
  const [item, setItem] = useState(null);
  const [progreso, setProgreso] = useState([]);
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    Promise.all([
      getAcondicionamiento(id).catch(() => null),
      getProgreso(id).catch(() => []),
    ]).then(([acond, prog]) => {
      setItem(acond);
      setProgreso(prog || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const marcarCompletado = async () => {
    Alert.alert('Marcar completado', '¿Confirmas que este acondicionamiento está terminado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Completar', onPress: async () => {
          await updateAcondicionamiento(id, { estado: 'completado' });
          setItem(prev => ({ ...prev, estado: 'completado' }));
        }
      },
    ]);
  };

  const agregarNota = async () => {
    if (!nota.trim()) return;
    setGuardando(true);
    await addProgreso({ acondicionamientoId: id, texto: nota.trim(), usuario: perfil?.nombre || '' });
    const prog = await getProgreso(id);
    setProgreso(prog);
    setNota('');
    setGuardando(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6D28D9" /></View>;
  if (!item) return <View style={styles.center}><Text>No encontrado.</Text></View>;

  const estadoNorm = (item.estado || '').toLowerCase().replace(/[\s_-]/g, '');
  const estadoKey = estadoNorm.includes('progres') ? 'en_progreso' : estadoNorm.includes('complet') ? 'completado' : 'pendiente';
  const est = ESTADO_ESTILOS[estadoKey];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editarBtn}>
            <Text style={styles.editarText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.titulo}>{item.nombre}</Text>
        <Text style={styles.subinfo}>
          {item.equipo ? `⚙️ ${item.equipo}` : ''}
          {item.numeroSerie ? `  •  N/S: ${item.numeroSerie}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.estadoBadge, { backgroundColor: est.bg }]}>
            <Text style={[styles.estadoText, { color: est.text }]}>{est.label}</Text>
          </View>
          {item.ingeniero ? <Text style={styles.ing}>🧑‍🔧 {item.ingeniero}</Text> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Instaladas', emoji: '🔩', val: item.instaladas ?? 0 },
            { label: 'Retiradas',  emoji: '🗃️', val: item.retiradas ?? 0 },
            { label: 'Movimientos', emoji: '📦', val: item.movimientos ?? 0 },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.emoji} {s.label}</Text>
            </View>
          ))}
        </View>

        {/* Descripción */}
        <Text style={styles.seccionTitulo}>📋 DESCRIPCIÓN</Text>
        <View style={styles.descBox}>
          <Text style={styles.descText}>{item.descripcion || 'Sin descripción.'}</Text>
        </View>

        {/* Marcar completado */}
        {estadoKey !== 'completado' && (
          <TouchableOpacity style={styles.completarBtn} onPress={marcarCompletado}>
            <Text style={styles.completarText}>✅ Marcar completado</Text>
          </TouchableOpacity>
        )}

        {/* Refacciones del proyecto */}
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>🔩 REFACCIONES DEL PROYECTO</Text>
          <TouchableOpacity style={styles.agregarBtn}>
            <Text style={styles.agregarText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sinRefacciones}>Sin refacciones registradas en este proyecto.</Text>

        {/* Bitácora */}
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>📝 BITÁCORA DE PROGRESO</Text>
          <TouchableOpacity style={styles.agregarBtn} onPress={agregarNota} disabled={guardando}>
            <Text style={styles.agregarText}>+ Nota</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notaInputRow}>
          <TextInput
            style={styles.notaInput}
            placeholder="Describe el avance, observación o resultado..."
            value={nota}
            onChangeText={setNota}
            multiline
          />
          {nota.trim() ? (
            <TouchableOpacity style={styles.notaEnviar} onPress={agregarNota} disabled={guardando}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {progreso.map(p => (
          <View key={p.id} style={styles.progresoItem}>
            <View style={styles.progresoDot} />
            <View style={styles.progresoCard}>
              <Text style={styles.progresoFecha}>{formatFecha(p.creadoEn)}</Text>
              <Text style={styles.progresoTexto}>{p.texto}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const PURPLE = '#6D28D9';
const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: PURPLE, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  volver: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  editarBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editarText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subinfo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  estadoText: { fontSize: 12, fontWeight: '700' },
  ing: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  statNum: { fontSize: 26, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  seccionTitulo: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  descBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  descText: { fontSize: 14, color: '#333', lineHeight: 22 },
  completarBtn: { backgroundColor: '#2E7D32', borderRadius: 14, padding: 16, alignItems: 'center', marginVertical: 16 },
  completarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  agregarBtn: { backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  agregarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sinRefacciones: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 8 },
  notaInputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  notaInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0', minHeight: 60, textAlignVertical: 'top' },
  notaEnviar: { backgroundColor: PURPLE, borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  progresoItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  progresoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PURPLE, marginTop: 6 },
  progresoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  progresoFecha: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  progresoTexto: { fontSize: 14, color: '#333', lineHeight: 20 },
});
