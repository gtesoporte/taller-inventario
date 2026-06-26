import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  suscribirCajuelaInventario, suscribirCajuelaMovimientos,
  addCajuelaEntrada, addCajuelaSalida, RAZONES_CAJUELA,
} from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { seleccionarFoto } from '../utils/fotoHelper';

function formatFecha(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const COLORES_RAZON = {
  dano_servicio: '#E53935',
  dano_no_reportado: '#FB8C00',
  desgaste: '#8E24AA',
  otros: '#546E7A',
};

export default function DetalleCajuelaScreen({ navigation, route }) {
  const { cajuelaId, nombre } = route?.params || {};
  const { perfil } = useAuth();
  const [tab, setTab] = useState('inventario');
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [partes, setPartes] = useState([]);

  // Panel de movimiento
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelTipo, setPanelTipo] = useState('entrada');
  const [panelNombre, setPanelNombre] = useState('');
  const [panelBusqueda, setPanelBusqueda] = useState('');
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [panelCantidad, setPanelCantidad] = useState('1');
  const [panelRazon, setPanelRazon] = useState('');
  const [panelMotivo, setPanelMotivo] = useState('');
  const [panelFoto, setPanelFoto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [panelError, setPanelError] = useState('');

  useEffect(() => {
    if (!cajuelaId) return;
    const u1 = suscribirCajuelaInventario(cajuelaId, setInventario);
    const u2 = suscribirCajuelaMovimientos(cajuelaId, setMovimientos);
    getDocs(collection(db, 'partes')).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
      setPartes(data);
    }).catch(() => {});
    return () => { u1(); u2(); };
  }, [cajuelaId]);

  // Opciones del picker según tipo: entradas desde partes globales, salidas desde inventario cajuela
  const opcionesEntrada = partes.filter(p =>
    !panelBusqueda || p.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase())
  );
  const opcionesSalida = inventario.filter(i =>
    !panelBusqueda || i.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase())
  );
  const opciones = panelTipo === 'salida' ? opcionesSalida : opcionesEntrada;

  const seleccionarParte = (item) => {
    setPanelNombre(item.nombre);
    setPanelBusqueda('');
    setPickerAbierto(false);
    setPanelError('');
  };

  const abrirPanel = (tipo) => {
    setPanelTipo(tipo);
    setPanelNombre('');
    setPanelBusqueda('');
    setPickerAbierto(false);
    setPanelCantidad('1');
    setPanelRazon('');
    setPanelMotivo('');
    setPanelFoto('');
    setPanelError('');
    setPanelAbierto(true);
  };

  const confirmarMovimiento = async () => {
    const nom = panelNombre.trim();
    const cant = parseInt(panelCantidad, 10);
    if (!nom) { setPanelError('Selecciona una refacción de la lista.'); return; }
    if (!cant || cant <= 0) { setPanelError('La cantidad debe ser mayor a 0.'); return; }
    if (panelTipo === 'salida' && !panelRazon) { setPanelError('Selecciona la razón de uso.'); return; }
    if (panelTipo === 'salida' && panelRazon === 'otros' && !panelMotivo.trim()) {
      setPanelError('Escribe el motivo específico.'); return;
    }
    setGuardando(true);
    try {
      if (panelTipo === 'entrada') {
        await addCajuelaEntrada(cajuelaId, nom, cant, perfil, panelFoto);
      } else {
        await addCajuelaSalida(cajuelaId, nom, cant, panelRazon, panelMotivo, perfil);
      }
      setPanelAbierto(false);
    } catch {
      setPanelError('Error al guardar. Intenta de nuevo.');
    }
    setGuardando(false);
  };

  // Estadísticas de salidas
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  const totalSalidas = salidas.reduce((s, m) => s + (m.cantidad || 0), 0);
  const statsPorRazon = RAZONES_CAJUELA.map(r => ({
    ...r,
    cantidad: salidas.filter(m => m.razon === r.id).reduce((s, m) => s + (m.cantidad || 0), 0),
  })).filter(r => r.cantidad > 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Cajuelas</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>🧰 {nombre}</Text>
        <View style={styles.tabs}>
          {['inventario', 'movimientos'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'inventario' ? '📦 Inventario' : '📋 Movimientos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Panel de movimiento */}
      {panelAbierto && (
        <ScrollView
          style={[styles.panel, panelTipo === 'entrada' ? styles.panelEntrada : styles.panelSalida]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
        >
          <Text style={styles.panelTitulo}>
            {panelTipo === 'entrada' ? '▲ Registrar entrada' : '▼ Registrar uso'}
          </Text>

          {/* Picker de refacción */}
          <Text style={styles.panelLabel}>REFACCIÓN *</Text>
          {panelNombre ? (
            <View style={styles.parteSelBox}>
              <Text style={styles.parteSelNombre}>✅ {panelNombre}</Text>
              <TouchableOpacity onPress={() => { setPanelNombre(''); setPanelBusqueda(''); setPickerAbierto(false); }}>
                <Text style={styles.parteSelX}>✕ cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.panelInput}
                value={panelBusqueda}
                onChangeText={v => { setPanelBusqueda(v); setPickerAbierto(true); setPanelError(''); }}
                onFocus={() => setPickerAbierto(true)}
                placeholder={
                  panelTipo === 'salida'
                    ? 'Buscar en inventario de cajuela...'
                    : 'Buscar en refacciones del sistema...'
                }
                placeholderTextColor="#aaa"
                autoCorrect={false}
              />
              {pickerAbierto && (
                <View style={styles.pickerDropdown}>
                  {opciones.slice(0, 7).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.pickerItem}
                      onPress={() => seleccionarParte(item)}
                    >
                      <Text style={styles.pickerNombre}>{item.nombre}</Text>
                      {item.fabricante
                        ? <Text style={styles.pickerSub}>{item.fabricante}</Text>
                        : null}
                    </TouchableOpacity>
                  ))}
                  {opciones.length > 7 && (
                    <Text style={styles.pickerMas}>
                      +{opciones.length - 7} más · escribe para filtrar
                    </Text>
                  )}
                  {opciones.length === 0 && (
                    <Text style={styles.pickerVacio}>
                      {panelTipo === 'salida'
                        ? 'Sin piezas en esta cajuela.'
                        : 'Sin refacciones encontradas.'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Cantidad */}
          <Text style={[styles.panelLabel, { marginTop: 12 }]}>CANTIDAD *</Text>
          <TextInput
            style={[styles.panelInput, { width: 90 }]}
            value={panelCantidad}
            onChangeText={setPanelCantidad}
            keyboardType="numeric"
            selectTextOnFocus
            onFocus={() => setPickerAbierto(false)}
          />

          {/* Foto — solo en entradas */}
          {panelTipo === 'entrada' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 12 }]}>FOTOGRAFÍA (OPCIONAL)</Text>
              {panelFoto ? (
                <View>
                  <Image source={{ uri: panelFoto }} style={styles.fotoPreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setPanelFoto('')}>
                    <Text style={styles.fotoQuitarText}>🗑️ Quitar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.fotoBtnsRow}>
                  <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(setPanelFoto, 'camara')}>
                    <Text style={styles.fotoAddIcon}>📷</Text>
                    <Text style={styles.fotoAddText}>Cámara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(setPanelFoto, 'galeria')}>
                    <Text style={styles.fotoAddIcon}>🖼️</Text>
                    <Text style={styles.fotoAddText}>Galería</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Razón — solo en salidas */}
          {panelTipo === 'salida' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 12 }]}>RAZÓN DE USO *</Text>
              <View style={styles.razonesWrap}>
                {RAZONES_CAJUELA.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.razonChip, panelRazon === r.id && { backgroundColor: COLORES_RAZON[r.id], borderColor: COLORES_RAZON[r.id] }]}
                    onPress={() => { setPanelRazon(r.id); setPanelError(''); }}
                  >
                    <Text style={[styles.razonChipText, panelRazon === r.id && { color: '#fff' }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {panelRazon === 'otros' && (
                <>
                  <Text style={[styles.panelLabel, { marginTop: 12 }]}>MOTIVO ESPECÍFICO *</Text>
                  <TextInput
                    style={styles.panelInput}
                    value={panelMotivo}
                    onChangeText={v => { setPanelMotivo(v); setPanelError(''); }}
                    placeholder="Describe el motivo..."
                    placeholderTextColor="#bbb"
                    multiline
                  />
                </>
              )}
            </>
          )}

          {!!panelError && <Text style={styles.panelError}>⚠️ {panelError}</Text>}

          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.panelCancelar} onPress={() => setPanelAbierto(false)} disabled={guardando}>
              <Text style={styles.panelCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.panelConfirmar, { backgroundColor: panelTipo === 'entrada' ? '#2E7D32' : '#C62828' }]}
              onPress={confirmarMovimiento}
              disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.panelConfirmarText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Contenido */}
      {tab === 'inventario' ? (
        <FlatList
          data={inventario}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.invCard}>
              {item.foto
                ? <Image source={{ uri: item.foto }} style={styles.invThumb} resizeMode="cover" />
                : <View style={[styles.invThumb, styles.invThumbPlaceholder]}>
                    <Text style={{ fontSize: 26 }}>🔩</Text>
                  </View>
              }
              <Text style={styles.invNombre} numberOfLines={2}>{item.nombre}</Text>
              <View style={[styles.cantBadge, (item.cantidad || 0) <= 0 && styles.cantBadgeRed]}>
                <Text style={[styles.cantNum, (item.cantidad || 0) <= 0 && { color: '#C62828' }]}>
                  {item.cantidad || 0}
                </Text>
                <Text style={styles.cantLabel}>pz</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Sin refacciones en inventario.</Text>
              <Text style={styles.emptyHint}>Usa "▲ Entrada" para agregar refacciones a esta cajuela.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          {/* Estadísticas */}
          {totalSalidas > 0 && (
            <View style={styles.statsBox}>
              <Text style={styles.statsTitle}>📊 Estadísticas de uso</Text>
              <Text style={styles.statsTotal}>{totalSalidas} piezas utilizadas en total</Text>
              {statsPorRazon.map(r => (
                <View key={r.id} style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: COLORES_RAZON[r.id] }]} />
                  <Text style={styles.statLabel} numberOfLines={2}>{r.label}</Text>
                  <Text style={styles.statCant}>{r.cantidad} pz</Text>
                  <Text style={styles.statPct}>
                    {Math.round((r.cantidad / totalSalidas) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Lista de movimientos */}
          {movimientos.length === 0
            ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Sin movimientos registrados.</Text>
              </View>
            )
            : movimientos.map(m => {
              const esEntrada = m.tipo === 'entrada';
              const razonObj = RAZONES_CAJUELA.find(r => r.id === m.razon);
              return (
                <View key={m.id} style={[styles.movCard, { borderLeftColor: esEntrada ? '#4CAF50' : '#F44336' }]}>
                  <View style={styles.movTop}>
                    <View style={[styles.tipoBadge, esEntrada ? styles.tipoBadgeE : styles.tipoBadgeS]}>
                      <Text style={[styles.tipoText, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                        {esEntrada ? '▲ ENTRADA' : '▼ USO'}
                      </Text>
                    </View>
                    <Text style={[styles.movCant, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                      {esEntrada ? '+' : '-'}{m.cantidad} pz
                    </Text>
                  </View>

                  <Text style={styles.movNombre}>{m.nombre}</Text>

                  {m.foto ? (
                    <Image source={{ uri: m.foto }} style={styles.movFoto} resizeMode="cover" />
                  ) : null}

                  {razonObj && (
                    <View style={[styles.razonTag, { backgroundColor: COLORES_RAZON[m.razon] + '22' }]}>
                      <Text style={[styles.razonTagText, { color: COLORES_RAZON[m.razon] }]}>{razonObj.label}</Text>
                    </View>
                  )}
                  {m.motivo ? <Text style={styles.movMotivo}>💬 {m.motivo}</Text> : null}

                  <View style={styles.movMeta}>
                    {m.usuario ? (
                      <View style={styles.usuarioBadge}>
                        <Text style={styles.usuarioText}>👤 {m.usuario}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.movFecha}>{formatFecha(m.creadoEn)}</Text>
                  </View>
                </View>
              );
            })
          }
        </ScrollView>
      )}

      {/* FABs */}
      {!panelAbierto && (
        <View style={styles.fabs}>
          <TouchableOpacity style={[styles.fab, styles.fabEntrada]} onPress={() => abrirPanel('entrada')}>
            <Text style={styles.fabText}>▲ Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, styles.fabSalida]} onPress={() => abrirPanel('salida')}>
            <Text style={styles.fabText}>▼ Uso</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 14 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  tabTextActive: { color: AZUL },

  // Panel
  panel: { maxHeight: 460, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 14 },
  panelEntrada: { backgroundColor: '#E8F5E9', borderBottomColor: '#A5D6A7' },
  panelSalida: { backgroundColor: '#FFF3E0', borderBottomColor: '#FFCC80' },
  panelTitulo: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },

  // Picker
  parteSelBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#4CAF50' },
  parteSelNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  parteSelX: { fontSize: 12, color: '#888', marginLeft: 10, fontWeight: '600' },
  pickerDropdown: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginTop: 4, overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  pickerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  pickerMas: { fontSize: 12, color: '#888', padding: 10, textAlign: 'center', fontStyle: 'italic' },
  pickerVacio: { fontSize: 13, color: '#aaa', padding: 14, textAlign: 'center' },

  // Foto en panel
  fotoPreview: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#e0e0e0' },
  fotoQuitarBtn: { marginTop: 6, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8, alignItems: 'center' },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 12 },
  fotoBtnsRow: { flexDirection: 'row', gap: 8 },
  fotoAddBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 10, paddingVertical: 14, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  fotoAddIcon: { fontSize: 26 },
  fotoAddText: { fontSize: 12, color: '#888', fontWeight: '600' },

  // Razones
  razonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  razonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  razonChipText: { fontSize: 12, fontWeight: '600', color: '#555' },

  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600', marginTop: 10 },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 6 },
  panelCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  panelCancelarText: { color: '#555', fontWeight: '700' },
  panelConfirmar: { flex: 2, borderRadius: 10, padding: 12, alignItems: 'center' },
  panelConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Inventario
  invCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, alignItems: 'center', gap: 12 },
  invThumb: { width: 52, height: 52, borderRadius: 10 },
  invThumbPlaceholder: { backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  invNombre: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 44 },
  cantBadgeRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 16, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 9, color: '#888' },

  // Stats
  statsBox: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  statsTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  statsTotal: { fontSize: 12, color: '#888', marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { flex: 1, fontSize: 12, color: '#444' },
  statCant: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', minWidth: 40, textAlign: 'right' },
  statPct: { fontSize: 12, color: '#888', minWidth: 36, textAlign: 'right' },

  // Movimientos
  movCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  movTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tipoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeE: { backgroundColor: '#E8F5E9' },
  tipoBadgeS: { backgroundColor: '#FFEBEE' },
  tipoText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  movCant: { fontSize: 18, fontWeight: '900' },
  movNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  movFoto: { width: '100%', height: 120, borderRadius: 10, marginBottom: 8, backgroundColor: '#e0e0e0' },
  razonTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  razonTagText: { fontSize: 12, fontWeight: '700' },
  movMotivo: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 8 },
  movMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  usuarioBadge: { backgroundColor: '#EEF2F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  usuarioText: { fontSize: 12, fontWeight: '700', color: '#444' },
  movFecha: { fontSize: 11, color: '#bbb' },

  // FABs
  fabs: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', gap: 12 },
  fab: { flex: 1, borderRadius: 14, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 4 },
  fabEntrada: { backgroundColor: '#2E7D32' },
  fabSalida: { backgroundColor: '#C62828' },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
