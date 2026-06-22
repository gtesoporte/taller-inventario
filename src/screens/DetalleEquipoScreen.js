import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { getEquipo, deleteEquipo } from '../config/firestore';

function formatFecha(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export default function DetalleEquipoScreen({ navigation, route }) {
  const { id } = route?.params || {};
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getEquipo(id)
      .then(setEquipo)
      .catch(() => setError('No se pudo cargar el equipo.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await deleteEquipo(id);
      navigation.goBack();
    } catch {
      setError('No se pudo eliminar el equipo.');
      setEliminando(false);
      setConfirmEliminar(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  if (!equipo || error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#C62828', fontSize: 15 }}>{error || 'Equipo no encontrado.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#1976D2' }}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Equipos</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.equipoIconGrande}>
            <Text style={{ fontSize: 40 }}>🖥️</Text>
          </View>
          <Text style={styles.headerModelo}>{equipo.modelo}</Text>
          {equipo.fabricante && (
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{equipo.fabricante.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Foto */}
        {equipo.foto ? (
          <Image source={{ uri: equipo.foto }} style={styles.foto} resizeMode="cover" />
        ) : null}

        {/* Detalles */}
        <View style={styles.seccion}>
          <Fila label="Modelo" valor={equipo.modelo} />
          <Fila label="Fabricante" valor={equipo.fabricante || '—'} />
          <Fila label="Número de serie" valor={equipo.numeroSerie || '—'} />
          <Fila label="Ubicación" valor={equipo.ubicacion || '—'} />
          <Fila label="Registrado" valor={formatFecha(equipo.creadoEn) || '—'} />
          {equipo.actualizadoEn && equipo.actualizadoEn !== equipo.creadoEn && (
            <Fila label="Actualizado" valor={formatFecha(equipo.actualizadoEn)} />
          )}
          {equipo.observaciones ? (
            <View style={obsStyles.box}>
              <Text style={obsStyles.label}>Observaciones</Text>
              <Text style={obsStyles.texto}>{equipo.observaciones}</Text>
            </View>
          ) : null}
        </View>

        {/* Botones de acción */}
        <TouchableOpacity
          style={styles.btnEditar}
          onPress={() => navigation.navigate('FormEquipo', { id, equipo })}
        >
          <Text style={styles.btnEditarText}>✏️ Editar equipo</Text>
        </TouchableOpacity>

        {/* Eliminar */}
        {!confirmEliminar ? (
          <TouchableOpacity style={styles.btnEliminar} onPress={() => setConfirmEliminar(true)}>
            <Text style={styles.btnEliminarText}>🗑️ Eliminar equipo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmLabel}>¿Eliminar "{equipo.modelo}"?</Text>
            <Text style={styles.confirmSub}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmNo}
                onPress={() => setConfirmEliminar(false)}
                disabled={eliminando}
              >
                <Text style={styles.confirmNoText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSi}
                onPress={handleEliminar}
                disabled={eliminando}
              >
                {eliminando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmSiText}>Eliminar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function Fila({ label, valor }) {
  return (
    <View style={filaStyles.row}>
      <Text style={filaStyles.label}>{label}</Text>
      <Text style={filaStyles.valor}>{valor}</Text>
    </View>
  );
}

const obsStyles = StyleSheet.create({
  box: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 6 },
  texto: { fontSize: 14, color: '#1a1a2e', lineHeight: 20 },
});

const filaStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, color: '#888', fontWeight: '600', flex: 1 },
  valor: { fontSize: 14, color: '#1a1a2e', fontWeight: '700', flex: 2, textAlign: 'right' },
});

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50, paddingBottom: 24, alignItems: 'flex-start' },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16 },
  headerContent: { alignSelf: 'stretch', alignItems: 'center' },
  equipoIconGrande: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  headerModelo: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  fabBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 },
  fabBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  foto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#e0e0e0' },
  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  btnEditar: { backgroundColor: '#1565C0', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10 },
  btnEditarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnEliminar: { borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#C62828' },
  btnEliminarText: { color: '#C62828', fontWeight: '700', fontSize: 15 },
  confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#FFCDD2' },
  confirmLabel: { fontSize: 15, fontWeight: '800', color: '#C62828', marginBottom: 4 },
  confirmSub: { fontSize: 13, color: '#888', marginBottom: 14 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmNo: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  confirmNoText: { color: '#555', fontWeight: '700' },
  confirmSi: { flex: 1, backgroundColor: '#C62828', borderRadius: 10, padding: 12, alignItems: 'center' },
  confirmSiText: { color: '#fff', fontWeight: '700' },
});
