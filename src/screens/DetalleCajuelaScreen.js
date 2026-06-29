import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import {
  suscribirCajuelaInventario, suscribirCajuelaMovimientos,
  addCajuelaEntrada, addCajuelaSalida, RAZONES_CAJUELA,
  updateCajuelaInventarioItem, deleteCajuelaInventarioItem,
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

function FotoButtons({ onFoto }) {
  return (
    <View style={styles.fotoBtnsRow}>
      <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(onFoto, 'camara')}>
        <Text style={styles.fotoAddIcon}>📷</Text>
        <Text style={styles.fotoAddText}>Cámara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(onFoto, 'galeria')}>
        <Text style={styles.fotoAddIcon}>🖼️</Text>
        <Text style={styles.fotoAddText}>Galería / PC</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DetalleCajuelaScreen({ navigation, route }) {
  const { cajuelaId, nombre } = route?.params || {};
  const { perfil } = useAuth();
  const [tab, setTab] = useState('inventario');
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  // ── Panel movimiento ─────────────────────────────────────────
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelTipo, setPanelTipo] = useState('entrada');
  // Entrada: panelBusqueda ES el nombre (texto libre + sugerencias del inventario)
  // Salida:  panelNombre es la selección obligatoria del inventario
  const [panelBusqueda, setPanelBusqueda] = useState('');
  const [panelNombre, setPanelNombre] = useState('');
  const [sugsVisible, setSugsVisible] = useState(false);
  const [panelCantidad, setPanelCantidad] = useState('1');
  const [panelRazon, setPanelRazon] = useState('');
  const [panelMotivo, setPanelMotivo] = useState('');
  const [panelFoto, setPanelFoto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [panelError, setPanelError] = useState('');

  // ── Panel edición de ítem ────────────────────────────────────
  const [editItem, setEditItem] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editFoto, setEditFoto] = useState('');
  const [editGuardando, setEditGuardando] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!cajuelaId) return;
    const u1 = suscribirCajuelaInventario(cajuelaId, setInventario);
    const u2 = suscribirCajuelaMovimientos(cajuelaId, setMovimientos);
    return () => { u1(); u2(); };
  }, [cajuelaId]);

  // Sugerencias para entrada (inventario cajuela filtrado por lo que se escribe)
  const sugerencias = panelBusqueda
    ? inventario.filter(i => i.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase()))
    : inventario;

  // Opciones para salida (inventario cajuela filtrado)
  const opcionesSalida = inventario.filter(i =>
    !panelBusqueda || i.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase())
  );

  // ── Handlers de movimiento ───────────────────────────────────
  const abrirPanel = (tipo) => {
    setEditItem(null);
    setPanelTipo(tipo);
    setPanelBusqueda('');
    setPanelNombre('');
    setSugsVisible(false);
    setPanelCantidad('1');
    setPanelRazon('');
    setPanelMotivo('');
    setPanelFoto('');
    setPanelError('');
    setPanelAbierto(true);
  };

  const confirmarMovimiento = async () => {
    const nom = panelTipo === 'entrada'
      ? panelBusqueda.trim()
      : panelNombre.trim();
    const cant = parseInt(panelCantidad, 10);
    if (!nom) {
      setPanelError(panelTipo === 'entrada'
        ? 'Escribe el nombre de la refacción.'
        : 'Selecciona una refacción de la lista.');
      return;
    }
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

  // ── Handlers de edición ──────────────────────────────────────
  const abrirEdicion = (item) => {
    setPanelAbierto(false);
    setEditItem(item);
    setEditNombre(item.nombre);
    setEditCantidad(String(item.cantidad ?? 0));
    setEditFoto(item.foto || '');
    setEditError('');
    setConfirmDelete(false);
  };

  const guardarEdicion = async () => {
    const nom = editNombre.trim();
    const cant = parseInt(editCantidad, 10);
    if (!nom) { setEditError('El nombre no puede estar vacío.'); return; }
    if (isNaN(cant) || cant < 0) { setEditError('Cantidad inválida.'); return; }
    setEditGuardando(true);
    try {
      await updateCajuelaInventarioItem(editItem.id, {
        nombre: nom,
        cantidad: cant,
        foto: editFoto || null,
      });
      setEditItem(null);
    } catch {
      setEditError('Error al guardar. Intenta de nuevo.');
    }
    setEditGuardando(false);
  };

  const eliminarItem = async () => {
    setEditGuardando(true);
    try {
      await deleteCajuelaInventarioItem(editItem.id);
      setEditItem(null);
    } catch {
      setEditError('Error al eliminar.');
      setEditGuardando(false);
    }
  };

  // ── Estadísticas ─────────────────────────────────────────────
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  const totalSalidas = salidas.reduce((s, m) => s + (m.cantidad || 0), 0);
  const statsPorRazon = RAZONES_CAJUELA.map(r => ({
    ...r,
    cantidad: salidas.filter(m => m.razon === r.id).reduce((s, m) => s + (m.cantidad || 0), 0),
  })).filter(r => r.cantidad > 0);

  const panelVisible = panelAbierto || !!editItem;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
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

      {/* ── Panel: NUEVO MOVIMIENTO ── */}
      {panelAbierto && (
        <ScrollView
          style={[styles.panel, panelTipo === 'entrada' ? styles.panelE : styles.panelS]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
        >
          <Text style={styles.panelTitulo}>
            {panelTipo === 'entrada' ? '▲ Registrar entrada' : '▼ Registrar uso'}
          </Text>

          {/* Picker / campo de refacción */}
          <Text style={styles.panelLabel}>REFACCIÓN *</Text>

          {panelTipo === 'entrada' ? (
            /* ─ ENTRADA: texto libre + sugerencias del inventario ─ */
            <View>
              <TextInput
                style={styles.panelInput}
                value={panelBusqueda}
                onChangeText={v => { setPanelBusqueda(v); setSugsVisible(true); setPanelError(''); }}
                onFocus={() => setSugsVisible(true)}
                placeholder="Escribe o busca una refacción..."
                placeholderTextColor="#aaa"
                autoCorrect={false}
              />
              {sugsVisible && sugerencias.length > 0 && (
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownHint}>Sugerencias del inventario de esta cajuela:</Text>
                  {sugerencias.slice(0, 6).map(i => (
                    <TouchableOpacity
                      key={i.id}
                      style={styles.dropdownItem}
                      onPress={() => { setPanelBusqueda(i.nombre); setSugsVisible(false); }}
                    >
                      <Text style={styles.dropdownNombre}>{i.nombre}</Text>
                      <Text style={styles.dropdownCant}>{i.cantidad} pz</Text>
                    </TouchableOpacity>
                  ))}
                  {sugerencias.length > 6 && (
                    <Text style={styles.dropdownMas}>+{sugerencias.length - 6} más · escribe para filtrar</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* ─ SALIDA: selección obligatoria del inventario ─ */
            panelNombre ? (
              <View style={styles.selBox}>
                <Text style={styles.selNombre}>✅ {panelNombre}</Text>
                <TouchableOpacity onPress={() => { setPanelNombre(''); setPanelBusqueda(''); }}>
                  <Text style={styles.selX}>✕ cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.panelInput}
                  value={panelBusqueda}
                  onChangeText={v => { setPanelBusqueda(v); setPanelError(''); }}
                  placeholder="Buscar en inventario de cajuela..."
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                />
                <View style={styles.dropdown}>
                  {opcionesSalida.length === 0
                    ? <Text style={styles.dropdownVacio}>Sin piezas en esta cajuela.</Text>
                    : opcionesSalida.slice(0, 7).map(i => (
                      <TouchableOpacity
                        key={i.id}
                        style={styles.dropdownItem}
                        onPress={() => { setPanelNombre(i.nombre); setPanelBusqueda(''); setPanelError(''); }}
                      >
                        <Text style={styles.dropdownNombre}>{i.nombre}</Text>
                        <Text style={styles.dropdownCant}>{i.cantidad} pz</Text>
                      </TouchableOpacity>
                    ))
                  }
                  {opcionesSalida.length > 7 && (
                    <Text style={styles.dropdownMas}>+{opcionesSalida.length - 7} más · escribe para filtrar</Text>
                  )}
                </View>
              </View>
            )
          )}

          {/* Cantidad */}
          <Text style={[styles.panelLabel, { marginTop: 12 }]}>CANTIDAD *</Text>
          <TextInput
            style={[styles.panelInput, { width: 90 }]}
            value={panelCantidad}
            onChangeText={setPanelCantidad}
            keyboardType="numeric"
            selectTextOnFocus
            onFocus={() => setSugsVisible(false)}
          />

          {/* Foto — solo en entradas */}
          {panelTipo === 'entrada' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 12 }]}>FOTOGRAFÍA (OPCIONAL)</Text>
              {panelFoto ? (
                <>
                  <Image source={{ uri: panelFoto }} style={styles.fotoPreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setPanelFoto('')}>
                    <Text style={styles.fotoQuitarText}>🗑️ Quitar foto</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <FotoButtons onFoto={setPanelFoto} />
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
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setPanelAbierto(false)} disabled={guardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirmar, { backgroundColor: panelTipo === 'entrada' ? '#2E7D32' : '#C62828' }]}
              onPress={confirmarMovimiento}
              disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnConfirmarText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Panel: EDITAR ÍTEM ── */}
      {editItem && (
        <ScrollView
          style={[styles.panel, styles.panelEdit]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
        >
          <Text style={styles.panelTitulo}>✏️ Editar refacción</Text>

          <Text style={styles.panelLabel}>NOMBRE</Text>
          <TextInput
            style={styles.panelInput}
            value={editNombre}
            onChangeText={v => { setEditNombre(v); setEditError(''); }}
            placeholder="Nombre de la refacción"
            placeholderTextColor="#bbb"
          />

          <Text style={[styles.panelLabel, { marginTop: 12 }]}>EXISTENCIA (corrección)</Text>
          <TextInput
            style={[styles.panelInput, { width: 90 }]}
            value={editCantidad}
            onChangeText={setEditCantidad}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.correccionHint}>Establece la cantidad real actual (sin crear movimiento).</Text>

          <Text style={[styles.panelLabel, { marginTop: 12 }]}>FOTOGRAFÍA</Text>
          {editFoto ? (
            <>
              <Image source={{ uri: editFoto }} style={styles.fotoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setEditFoto('')}>
                <Text style={styles.fotoQuitarText}>🗑️ Quitar foto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <FotoButtons onFoto={setEditFoto} />
          )}

          {!!editError && <Text style={styles.panelError}>⚠️ {editError}</Text>}

          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditItem(null)} disabled={editGuardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#1565C0' }]} onPress={guardarEdicion} disabled={editGuardando}>
              {editGuardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnConfirmarText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Eliminar ítem */}
          {!confirmDelete ? (
            <TouchableOpacity style={styles.btnEliminarItem} onPress={() => setConfirmDelete(true)}>
              <Text style={styles.btnEliminarItemText}>🗑️ Eliminar del inventario</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>¿Eliminar "{editItem.nombre}" del inventario?</Text>
              <View style={styles.panelBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setConfirmDelete(false)}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#C62828' }]} onPress={eliminarItem} disabled={editGuardando}>
                  {editGuardando
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnConfirmarText}>Eliminar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Contenido: INVENTARIO ── */}
      {tab === 'inventario' ? (
        <FlatList
          data={inventario}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.invCard}>
              {item.foto
                ? <Image source={{ uri: item.foto }} style={styles.invThumb} resizeMode="cover" />
                : <View style={[styles.invThumb, styles.invThumbPh]}>
                    <Text style={{ fontSize: 24 }}>🔩</Text>
                  </View>
              }
              <Text style={styles.invNombre} numberOfLines={2}>{item.nombre}</Text>
              <View style={[styles.cantBadge, (item.cantidad || 0) <= 0 && styles.cantBadgeRed]}>
                <Text style={[styles.cantNum, (item.cantidad || 0) <= 0 && { color: '#C62828' }]}>
                  {item.cantidad || 0}
                </Text>
                <Text style={styles.cantLabel}>pz</Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => abrirEdicion(item)}>
                <Text style={styles.editBtnText}>✏️</Text>
              </TouchableOpacity>
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
        /* ── Contenido: MOVIMIENTOS ── */
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          {totalSalidas > 0 && (
            <View style={styles.statsBox}>
              <Text style={styles.statsTitle}>📊 Estadísticas de uso</Text>
              <Text style={styles.statsTotal}>{totalSalidas} piezas utilizadas en total</Text>
              {statsPorRazon.map(r => (
                <View key={r.id} style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: COLORES_RAZON[r.id] }]} />
                  <Text style={styles.statLabel} numberOfLines={2}>{r.label}</Text>
                  <Text style={styles.statCant}>{r.cantidad} pz</Text>
                  <Text style={styles.statPct}>{Math.round((r.cantidad / totalSalidas) * 100)}%</Text>
                </View>
              ))}
            </View>
          )}

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
                  {m.foto ? <Image source={{ uri: m.foto }} style={styles.movFoto} resizeMode="cover" /> : null}
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

      {/* ── FABs ── */}
      {!panelVisible && (
        <View style={styles.fabs}>
          <TouchableOpacity style={[styles.fab, styles.fabE]} onPress={() => abrirPanel('entrada')}>
            <Text style={styles.fabText}>▲ Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, styles.fabS]} onPress={() => abrirPanel('salida')}>
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

  // Panels
  panel: { maxHeight: 480, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 14 },
  panelE: { backgroundColor: '#E8F5E9', borderBottomColor: '#A5D6A7' },
  panelS: { backgroundColor: '#FFF3E0', borderBottomColor: '#FFCC80' },
  panelEdit: { backgroundColor: '#E3F2FD', borderBottomColor: '#90CAF9' },
  panelTitulo: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600', marginTop: 10 },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4 },

  // Dropdown
  dropdown: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginTop: 4, overflow: 'hidden' },
  dropdownHint: { fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  dropdownCant: { fontSize: 13, color: '#888', fontWeight: '600' },
  dropdownMas: { fontSize: 12, color: '#aaa', padding: 10, textAlign: 'center', fontStyle: 'italic' },
  dropdownVacio: { fontSize: 13, color: '#aaa', padding: 14, textAlign: 'center' },

  // Selección salida
  selBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#4CAF50' },
  selNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  selX: { fontSize: 12, color: '#888', marginLeft: 10, fontWeight: '600' },

  // Foto
  fotoPreview: { width: '100%', height: 130, borderRadius: 10, backgroundColor: '#e0e0e0' },
  fotoQuitarBtn: { marginTop: 6, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 4 },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 12 },
  fotoBtnsRow: { flexDirection: 'row', gap: 8 },
  fotoAddBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  fotoAddIcon: { fontSize: 24 },
  fotoAddText: { fontSize: 11, color: '#888', fontWeight: '600' },

  // Razones
  razonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  razonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  razonChipText: { fontSize: 12, fontWeight: '600', color: '#555' },

  // Corrección hint
  correccionHint: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 4 },

  // Eliminar ítem
  btnEliminarItem: { marginTop: 10, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  btnEliminarItemText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  confirmBox: { marginTop: 10, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FFCC80' },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 10 },

  // Buttons
  btnCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelarText: { color: '#555', fontWeight: '700' },
  btnConfirmar: { flex: 2, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Inventario
  invCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, alignItems: 'center', gap: 10 },
  invThumb: { width: 50, height: 50, borderRadius: 10 },
  invThumbPh: { backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  invNombre: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 44 },
  cantBadgeRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 16, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 9, color: '#888' },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  editBtnText: { fontSize: 16 },

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
  fabE: { backgroundColor: '#2E7D32' },
  fabS: { backgroundColor: '#C62828' },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
