import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { getParte, deleteParte } from '../config/firestore';

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
  } catch {
    return '';
  }
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
  const [parte, setParte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!id) {
      setErrorMsg('No se recibió el ID de la refacción.');
      setLoading(false);
      return;
    }
    getParte(id)
      .then(p => {
        setParte(p);
        setLoading(false);
      })
      .catch(e => {
        setErrorMsg(e?.message || 'Error al cargar la refacción.');
        setLoading(false);
      });
  }, [id]);

  const handleEliminar = () => {
    Alert.alert('Eliminar refacción', `¿Seguro que deseas eliminar "${parte?.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try { await deleteParte(id); } catch {}
          navigation.goBack();
        }
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#c00', marginBottom: 16, textAlign: 'center', padding: 20 }}>Error: {errorMsg}</Text>
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

  const { valor: existencia } = getExistencia(parte);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.editarBtn} onPress={() => navigation.navigate('FormParte', { id, parte })}>
              <Text style={styles.editarText}>✏️ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.eliminarBtn} onPress={handleEliminar}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.nombre}>{parte.nombre ? String(parte.nombre).toUpperCase() : '—'}</Text>
        <View style={styles.existenciaCard}>
          <Text style={styles.existenciaNum}>{existencia}</Text>
          <Text style={styles.existenciaLabel}> piezas en existencia</Text>
        </View>
      </View>

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
    </View>
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
  nombre: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 14 },
  existenciaCard: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, alignSelf: 'flex-start' },
  existenciaNum: { fontSize: 32, fontWeight: '900', color: '#fff' },
  existenciaLabel: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginLeft: 6 },
  seccion: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 10, marginTop: 18 },
  foto: { width: '100%', height: 220, borderRadius: 14, marginBottom: 4, backgroundColor: '#e0e0e0' },
  ubicBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  ubicText: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  infoBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  infoLabel: { fontSize: 14, color: '#666', flex: 1 },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', maxWidth: '55%', textAlign: 'right' },
});
