import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { getEquipo, deleteEquipo, suscribirEquipoMovimientos, addEquipoMovimiento } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import ImagenViewer from '../components/ImagenViewer';

const CLASIF_MAP = {
  hueso: { label: '💀 Hueso', color: '#E53935' },
  reacondicionamiento: { label: '🔧 Reacondicionamiento', color: '#1565C0' },
  prestamo: { label: '🤝 Préstamo', color: '#2E7D32' },
};

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
  const { perfil } = useAuth();
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  // Movimientos de refacciones en este equipo
  const [movimientos, setMovimientos] = useState([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelTipo, setPanelTipo] = useState('entrada');
  const [panelNombre, setPanelNombre] = useState('');
  const [panelCantidad, setPanelCantidad] = useState('1');
  const [panelNota, setPanelNota] = useState('');
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [movError, setMovError] = useState('');

  useEffect(() => {
    if (!id) return;
    getEquipo(id)
      .then(setEquipo)
      .catch(() => setError('No se pudo cargar el equipo.'))
      .finally(() => setLoading(false));
    const unsub = suscribirEquipoMovimientos(id, setMovimientos);
    return unsub;
  }, [id]);

  const abrirPanel = (tipo) => {
    setPanelTipo(tipo);
    setPanelNombre('');
    setPanelCantidad('1');
    setPanelNota('');
    setMovError('');
    setPanelAbierto(true);
  };

  const confirmarMovimiento = async () => {
    const nom = panelNombre.trim();
    const cant = parseInt(panelCantidad, 10);
    if (!nom) { setMovError('Escribe el nombre de la refacción.'); return; }
    if (!cant || cant <= 0) { setMovError('La cantidad debe ser mayor a 0.'); return; }
    setGuardandoMov(true);
    try {
      await addEquipoMovimiento(id, panelTipo, nom, cant, panelNota.trim(), perfil);
      setPanelAbierto(false);
    } catch {
      setMovError('Error al guardar. Intenta de nuevo.');
    }
    setGuardandoMov(false);
  };

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
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {equipo.fabricante && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{equipo.fabricante.toUpperCase()}</Text>
              </View>
            )}
            {equipo.clasificacion && CLASIF_MAP[equipo.clasificacion] && (
              <View style={[styles.fabBadge, { backgroundColor: CLASIF_MAP[equipo.clasificacion].color }]}>
                <Text style={styles.fabBadgeText}>{CLASIF_MAP[equipo.clasificacion].label}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Foto */}
        {equipo.foto ? (
          <ImagenViewer uri={equipo.foto}>
            <Image source={{ uri: equipo.foto }} style={styles.foto} resizeMode="cover" />
          </ImagenViewer>
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

        {/* Refacciones en este equipo */}
        <View style={styles.seccion}>
          <View style={styles.movHeader}>
            <Text style={styles.movTitulo}>🔩 Refacciones del equipo</Text>
            <Text style={styles.movCount}>{movimientos.length} mov.</Text>
          </View>

          {/* Panel nuevo movimiento */}
          {panelAbierto && (
            <View style={[styles.panel, panelTipo === 'entrada' ? styles.panelE : styles.panelS]}>
              <Text style={styles.panelTit}>{panelTipo === 'entrada' ? '▲ Registrar entrada' : '▼ Registrar salida'}</Text>
              <Text style={styles.panelLbl}>REFACCIÓN *</Text>
              <TextInput
                style={styles.panelInput}
                value={panelNombre}
                onChangeText={v => { setPanelNombre(v); setMovError(''); }}
                placeholder="Nombre de la refacción"
                placeholderTextColor="#bbb"
              />
              <Text style={[styles.panelLbl, { marginTop: 10 }]}>CANTIDAD *</Text>
              <TextInput
                style={[styles.panelInput, { width: 90 }]}
                value={panelCantidad}
                onChangeText={setPanelCantidad}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.panelLbl, { marginTop: 10 }]}>NOTA</Text>
              <TextInput
                style={styles.panelInput}
                value={panelNota}
                onChangeText={setPanelNota}
                placeholder="Opcional..."
                placeholderTextColor="#bbb"
                multiline
              />
              {!!movError && <Text style={styles.panelError}>⚠️ {movError}</Text>}
              <View style={styles.panelBtns}>
                <TouchableOpacity style={styles.panelCancelar} onPress={() => setPanelAbierto(false)} disabled={guardandoMov}>
                  <Text style={styles.panelCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.panelConfirmar, { backgroundColor: panelTipo === 'entrada' ? '#2E7D32' : '#C62828' }]}
                  onPress={confirmarMovimiento}
                  disabled={guardandoMov}
                >
                  {guardandoMov
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.panelConfirmarText}>Confirmar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* FABs de movimiento */}
          {!panelAbierto && (
            <View style={styles.movFabs}>
              <TouchableOpacity style={[styles.movFab, { backgroundColor: '#2E7D32' }]} onPress={() => abrirPanel('entrada')}>
                <Text style={styles.movFabText}>▲ Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.movFab, { backgroundColor: '#C62828' }]} onPress={() => abrirPanel('salida')}>
                <Text style={styles.movFabText}>▼ Salida</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de movimientos */}
          {movimientos.length === 0
            ? <Text style={styles.movVacio}>Sin movimientos registrados.</Text>
            : movimientos.map(m => (
              <View key={m.id} style={[styles.movCard, { borderLeftColor: m.tipo === 'entrada' ? '#4CAF50' : '#F44336' }]}>
                <View style={styles.movTop}>
                  <Text style={[styles.movTipo, { color: m.tipo === 'entrada' ? '#2E7D32' : '#C62828' }]}>
                    {m.tipo === 'entrada' ? '▲ ENTRADA' : '▼ SALIDA'}
                  </Text>
                  <Text style={[styles.movCant, { color: m.tipo === 'entrada' ? '#2E7D32' : '#C62828' }]}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad} pz
                  </Text>
                </View>
                <Text style={styles.movNom}>{m.nombre}</Text>
                {m.nota ? <Text style={styles.movNota}>💬 {m.nota}</Text> : null}
                <Text style={styles.movFecha}>{formatFecha(m.creadoEn)}</Text>
              </View>
            ))
          }
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
  fabBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  fabBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  foto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#e0e0e0' },
  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  // Movimientos section
  movHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  movTitulo: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  movCount: { fontSize: 12, color: '#888' },
  movFabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  movFab: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  movFabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  movCard: { borderLeftWidth: 4, backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, marginBottom: 8 },
  movTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  movTipo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  movCant: { fontSize: 16, fontWeight: '900' },
  movNom: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  movNota: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 3 },
  movFecha: { fontSize: 11, color: '#bbb', marginTop: 4 },
  movVacio: { color: '#aaa', fontSize: 13, textAlign: 'center', marginVertical: 12 },
  // Panel
  panel: { borderRadius: 12, padding: 14, marginBottom: 14 },
  panelE: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  panelS: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  panelTit: { fontSize: 13, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  panelLbl: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 5 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600', marginTop: 8 },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  panelCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  panelCancelarText: { color: '#555', fontWeight: '700' },
  panelConfirmar: { flex: 2, borderRadius: 10, padding: 10, alignItems: 'center' },
  panelConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
