import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import {
  Nut, Pencil, Camera, Image as ImageIcon, ArrowLeft, Toolbox, Hourglass,
  ArrowUp, ArrowDown, CheckCircle2, X, Trash2, AlertTriangle, Upload,
  Download, User, Package, ClipboardList, MessageCircle, BarChart3, Siren,
} from 'lucide-react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import {
  suscribirCajuelaInventario, suscribirCajuelaMovimientos,
  addCajuelaEntrada, addCajuelaSalida, RAZONES_CAJUELA,
  updateCajuelaInventarioItem, deleteCajuelaInventarioItem,
  suscribirCajuelaConfig, updateCajuelaConfig,
  suscribirCajuelaRetiroActivo, addCajuelaRetiro, completarCajuelaRetiro,
  CATEGORIAS_MINIVIDAS, categorizarMinividas,
} from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { seleccionarFoto } from '../utils/fotoHelper';
import ImagenViewer from '../components/ImagenViewer';

function formatFecha(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatFechaCorta(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const COLORES_RAZON = {
  dano_servicio: '#E53935',
  dano_no_reportado: '#FB8C00',
  desgaste: '#8E24AA',
  otros: '#546E7A',
};

function InvCard({ item, onEdit }) {
  return (
    <View style={styles.invCard}>
      <ImagenViewer uri={item.foto || null}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={styles.invThumb} resizeMode="cover" />
          : <View style={[styles.invThumb, styles.invThumbPh]}><Nut size={20} color="#bbb" /></View>
        }
      </ImagenViewer>
      <Text style={styles.invNombre} numberOfLines={2}>{item.nombre}</Text>
      <View style={[styles.cantBadge, (item.cantidad || 0) <= 0 && styles.cantBadgeRed]}>
        <Text style={[styles.cantNum, (item.cantidad || 0) <= 0 && { color: '#C62828' }]}>{item.cantidad || 0}</Text>
        <Text style={styles.cantLabel}>pz</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
        <Pencil size={15} color="#555" />
      </TouchableOpacity>
    </View>
  );
}

function FotoButtons({ onFoto }) {
  return (
    <View style={styles.fotoBtnsRow}>
      <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(onFoto, 'camara')}>
        <Camera size={22} color="#888" />
        <Text style={styles.fotoAddText}>Cámara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(onFoto, 'galeria')}>
        <ImageIcon size={22} color="#888" />
        <Text style={styles.fotoAddText}>Galería / PC</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DetalleCajuelaScreen({ navigation, route }) {
  const { cajuelaId, nombre } = route?.params || {};
  const { perfil } = useAuth();
  const esMinividas = cajuelaId === 'minividas';

  const [tab, setTab] = useState('inventario');
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cajuelaFoto, setCajuelaFoto] = useState(null);
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [retiroActivo, setRetiroActivo] = useState(undefined); // undefined = loading

  // ── Panel movimiento ──────────────────────────────────────────
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelTipo, setPanelTipo] = useState('entrada');
  const [panelBusqueda, setPanelBusqueda] = useState('');
  const [panelNombre, setPanelNombre] = useState('');
  const [sugsVisible, setSugsVisible] = useState(false);
  const [panelCantidad, setPanelCantidad] = useState('1');
  const [panelRazon, setPanelRazon] = useState('');
  const [panelMotivo, setPanelMotivo] = useState('');
  const [panelFoto, setPanelFoto] = useState('');
  const [panelCategoria, setPanelCategoria] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [panelError, setPanelError] = useState('');

  // ── Panel edición ítem ────────────────────────────────────────
  const [editItem, setEditItem] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editFoto, setEditFoto] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editGuardando, setEditGuardando] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Panel retiro ──────────────────────────────────────────────
  // null | 'salida' | 'devolucion'
  const [retiroPanel, setRetiroPanel] = useState(null);
  const [procesandoRetiro, setProcesandoRetiro] = useState(false);
  const [retiroError, setRetiroError] = useState('');

  const anyPanelOpen = panelAbierto || !!editItem || !!retiroPanel;

  useEffect(() => {
    if (!cajuelaId) return;
    const u1 = suscribirCajuelaInventario(cajuelaId, setInventario);
    const u2 = suscribirCajuelaMovimientos(cajuelaId, setMovimientos);
    const u3 = suscribirCajuelaConfig(cajuelaId, config => setCajuelaFoto(config.foto || null));
    const u4 = suscribirCajuelaRetiroActivo(cajuelaId, setRetiroActivo);
    return () => { u1(); u2(); u3(); u4(); };
  }, [cajuelaId]);

  // ── Migración: asignar categoría a ítems existentes de MINIVIDAS sin categoría ──
  useEffect(() => {
    if (!esMinividas) return;
    const sinCategoria = inventario.filter(i => !i.categoria);
    sinCategoria.forEach(i => {
      updateCajuelaInventarioItem(i.id, { categoria: categorizarMinividas(i.nombre) }).catch(() => {});
    });
  }, [esMinividas, inventario]);

  // ── Foto cajuela ─────────────────────────────────────────────
  const cambiarFotoCajuela = () => {
    seleccionarFoto(async (b64) => {
      setGuardandoFoto(true);
      try { await updateCajuelaConfig(cajuelaId, { foto: b64 }); } catch {}
      setGuardandoFoto(false);
    }, 'galeria');
  };

  // ── Sugerencias / opciones ────────────────────────────────────
  const sugerencias = panelBusqueda
    ? inventario.filter(i => i.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase()))
    : inventario;
  const opcionesSalida = inventario.filter(i =>
    !panelBusqueda || i.nombre?.toLowerCase().includes(panelBusqueda.toLowerCase())
  );

  // ── Handlers movimiento ───────────────────────────────────────
  const abrirPanel = (tipo) => {
    setEditItem(null); setRetiroPanel(null);
    setPanelTipo(tipo); setPanelBusqueda(''); setPanelNombre('');
    setSugsVisible(false); setPanelCantidad('1');
    setPanelRazon(''); setPanelMotivo(''); setPanelFoto(''); setPanelCategoria(''); setPanelError('');
    setPanelAbierto(true);
  };

  const confirmarMovimiento = async () => {
    const nom = panelTipo === 'entrada' ? panelBusqueda.trim() : panelNombre.trim();
    const cant = parseInt(panelCantidad, 10);
    if (!nom) { setPanelError(panelTipo === 'entrada' ? 'Escribe el nombre de la refacción.' : 'Selecciona una refacción.'); return; }
    if (!cant || cant <= 0) { setPanelError('La cantidad debe ser mayor a 0.'); return; }
    if (panelTipo === 'salida' && !panelRazon) { setPanelError('Selecciona la razón de uso.'); return; }
    if (panelTipo === 'salida' && panelRazon === 'otros' && !panelMotivo.trim()) { setPanelError('Escribe el motivo específico.'); return; }
    if (esMinividas && panelTipo === 'entrada' && !panelCategoria) { setPanelError('Selecciona la categoría.'); return; }
    setGuardando(true);
    try {
      if (panelTipo === 'entrada') await addCajuelaEntrada(cajuelaId, nom, cant, perfil, panelFoto, esMinividas ? panelCategoria : undefined);
      else await addCajuelaSalida(cajuelaId, nom, cant, panelRazon, panelMotivo, perfil);
      setPanelAbierto(false);
    } catch { setPanelError('Error al guardar. Intenta de nuevo.'); }
    setGuardando(false);
  };

  // ── Handlers edición ítem ─────────────────────────────────────
  const abrirEdicion = (item) => {
    setPanelAbierto(false); setRetiroPanel(null);
    setEditItem(item); setEditNombre(item.nombre);
    setEditCantidad(String(item.cantidad ?? 0));
    setEditFoto(item.foto || ''); setEditError(''); setConfirmDelete(false);
    setEditCategoria(item.categoria || (esMinividas ? categorizarMinividas(item.nombre) : ''));
  };

  const guardarEdicion = async () => {
    const nom = editNombre.trim();
    const cant = parseInt(editCantidad, 10);
    if (!nom) { setEditError('El nombre no puede estar vacío.'); return; }
    if (isNaN(cant) || cant < 0) { setEditError('Cantidad inválida.'); return; }
    setEditGuardando(true);
    try {
      await updateCajuelaInventarioItem(editItem.id, {
        nombre: nom, cantidad: cant, foto: editFoto || null,
        ...(esMinividas ? { categoria: editCategoria } : {}),
      });
      setEditItem(null);
    } catch { setEditError('Error al guardar.'); }
    setEditGuardando(false);
  };

  const eliminarItem = async () => {
    setEditGuardando(true);
    try { await deleteCajuelaInventarioItem(editItem.id); setEditItem(null); }
    catch { setEditError('Error al eliminar.'); setEditGuardando(false); }
  };

  // ── Handlers retiro ───────────────────────────────────────────
  const confirmarSalidaCajuela = async () => {
    setProcesandoRetiro(true); setRetiroError('');
    try {
      await addCajuelaRetiro(cajuelaId, perfil);
      setRetiroPanel(null);
    } catch { setRetiroError('Error al registrar. Intenta de nuevo.'); }
    setProcesandoRetiro(false);
  };

  const confirmarDevolucionSinPiezas = async () => {
    if (!retiroActivo) return;
    setProcesandoRetiro(true); setRetiroError('');
    try {
      await completarCajuelaRetiro(retiroActivo.id, cajuelaId, false, perfil);
      setRetiroPanel(null);
    } catch { setRetiroError('Error al registrar. Intenta de nuevo.'); }
    setProcesandoRetiro(false);
  };

  const confirmarDevolucionConPiezas = async () => {
    if (!retiroActivo) return;
    setProcesandoRetiro(true); setRetiroError('');
    try {
      await completarCajuelaRetiro(retiroActivo.id, cajuelaId, true, perfil);
      setRetiroPanel(null);
      setTab('movimientos');
      setTimeout(() => abrirPanel('salida'), 80);
    } catch { setRetiroError('Error al registrar. Intenta de nuevo.'); }
    setProcesandoRetiro(false);
  };

  // ── Estadísticas ──────────────────────────────────────────────
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  const totalSalidas = salidas.reduce((s, m) => s + (m.cantidad || 0), 0);
  const statsPorRazon = RAZONES_CAJUELA.map(r => ({
    ...r,
    cantidad: salidas.filter(m => m.razon === r.id).reduce((s, m) => s + (m.cantidad || 0), 0),
  })).filter(r => r.cantidad > 0);

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.volverRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.volver}>Cajuelas</Text>
        </TouchableOpacity>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.cajuelaFotoBtn} onPress={cambiarFotoCajuela} disabled={guardandoFoto}>
            {cajuelaFoto
              ? <ImagenViewer uri={cajuelaFoto}><Image source={{ uri: cajuelaFoto }} style={styles.cajuelaFotoImg} resizeMode="cover" /></ImagenViewer>
              : <View style={styles.cajuelaFotoPh}><Toolbox size={28} color="#fff" /></View>
            }
            <View style={styles.cajuelaFotoCam}>
              {guardandoFoto ? <Hourglass size={11} color="#555" /> : <Camera size={11} color="#555" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.titulo}>{nombre}</Text>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════
          PANELES — ocupan todo el espacio restante
          ══════════════════════════════════════════════════════════ */}

      {/* ── PANEL: MOVIMIENTO ── */}
      {panelAbierto && (
        <ScrollView
          style={[styles.panelFull, panelTipo === 'entrada' ? styles.panelE : styles.panelS]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.panelContent}
          nestedScrollEnabled
        >
          <View style={styles.panelTituloRow}>
            {panelTipo === 'entrada' ? <ArrowUp size={16} color="#2E7D32" /> : <ArrowDown size={16} color="#C62828" />}
            <Text style={styles.panelTitulo}>
              {panelTipo === 'entrada' ? 'Registrar entrada' : 'Registrar uso'}
            </Text>
          </View>

          <Text style={styles.panelLabel}>REFACCIÓN *</Text>
          {panelTipo === 'entrada' ? (
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
                    <TouchableOpacity key={i.id} style={styles.dropdownItem}
                      onPress={() => { setPanelBusqueda(i.nombre); setSugsVisible(false); }}>
                      <Text style={styles.dropdownNombre}>{i.nombre}</Text>
                      <Text style={styles.dropdownCant}>{i.cantidad} pz</Text>
                    </TouchableOpacity>
                  ))}
                  {sugerencias.length > 6 && <Text style={styles.dropdownMas}>+{sugerencias.length - 6} más</Text>}
                </View>
              )}
            </View>
          ) : (
            panelNombre ? (
              <View style={styles.selBox}>
                <View style={styles.selNombreRow}>
                  <CheckCircle2 size={14} color="#2E7D32" />
                  <Text style={styles.selNombre}>{panelNombre}</Text>
                </View>
                <TouchableOpacity style={styles.selXRow} onPress={() => { setPanelNombre(''); setPanelBusqueda(''); }}>
                  <X size={12} color="#888" />
                  <Text style={styles.selX}>cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput style={styles.panelInput} value={panelBusqueda}
                  onChangeText={v => { setPanelBusqueda(v); setPanelError(''); }}
                  placeholder="Buscar en inventario de cajuela..." placeholderTextColor="#aaa" autoCorrect={false} />
                <View style={styles.dropdown}>
                  {opcionesSalida.length === 0
                    ? <Text style={styles.dropdownVacio}>Sin piezas en esta cajuela.</Text>
                    : opcionesSalida.slice(0, 7).map(i => (
                      <TouchableOpacity key={i.id} style={styles.dropdownItem}
                        onPress={() => { setPanelNombre(i.nombre); setPanelBusqueda(''); setPanelError(''); }}>
                        <Text style={styles.dropdownNombre}>{i.nombre}</Text>
                        <Text style={styles.dropdownCant}>{i.cantidad} pz</Text>
                      </TouchableOpacity>
                    ))
                  }
                  {opcionesSalida.length > 7 && <Text style={styles.dropdownMas}>+{opcionesSalida.length - 7} más</Text>}
                </View>
              </View>
            )
          )}

          <Text style={[styles.panelLabel, { marginTop: 14 }]}>CANTIDAD *</Text>
          <TextInput style={[styles.panelInput, { width: 90 }]} value={panelCantidad}
            onChangeText={setPanelCantidad} keyboardType="numeric" selectTextOnFocus
            onFocus={() => setSugsVisible(false)} />

          {esMinividas && panelTipo === 'entrada' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 14 }]}>CATEGORÍA *</Text>
              <View style={styles.razonesWrap}>
                {CATEGORIAS_MINIVIDAS.map(cat => (
                  <TouchableOpacity key={cat}
                    style={[styles.razonChip, panelCategoria === cat && styles.razonChipActiveAzul]}
                    onPress={() => { setPanelCategoria(cat); setPanelError(''); }}>
                    <Text style={[styles.razonChipText, panelCategoria === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {panelTipo === 'entrada' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 14 }]}>FOTOGRAFÍA (OPCIONAL)</Text>
              {panelFoto ? (
                <>
                  <ImagenViewer uri={panelFoto}>
                    <Image source={{ uri: panelFoto }} style={styles.fotoPreview} resizeMode="cover" />
                  </ImagenViewer>
                  <TouchableOpacity style={[styles.fotoQuitarBtn, styles.fotoQuitarRow]} onPress={() => setPanelFoto('')}>
                    <Trash2 size={13} color="#C62828" />
                    <Text style={styles.fotoQuitarText}>Quitar foto</Text>
                  </TouchableOpacity>
                </>
              ) : <FotoButtons onFoto={setPanelFoto} />}
            </>
          )}

          {panelTipo === 'salida' && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 14 }]}>RAZÓN DE USO *</Text>
              <View style={styles.razonesWrap}>
                {RAZONES_CAJUELA.map(r => (
                  <TouchableOpacity key={r.id}
                    style={[styles.razonChip, panelRazon === r.id && { backgroundColor: COLORES_RAZON[r.id], borderColor: COLORES_RAZON[r.id] }]}
                    onPress={() => { setPanelRazon(r.id); setPanelError(''); }}>
                    <Text style={[styles.razonChipText, panelRazon === r.id && { color: '#fff' }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {panelRazon === 'otros' && (
                <>
                  <Text style={[styles.panelLabel, { marginTop: 14 }]}>MOTIVO ESPECÍFICO *</Text>
                  <TextInput style={styles.panelInput} value={panelMotivo}
                    onChangeText={v => { setPanelMotivo(v); setPanelError(''); }}
                    placeholder="Describe el motivo..." placeholderTextColor="#bbb" multiline />
                </>
              )}
            </>
          )}

          {!!panelError && (
            <View style={styles.panelErrorRow}><AlertTriangle size={13} color="#C62828" /><Text style={styles.panelError}>{panelError}</Text></View>
          )}
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setPanelAbierto(false)} disabled={guardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: panelTipo === 'entrada' ? '#2E7D32' : '#C62828' }]}
              onPress={confirmarMovimiento} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── PANEL: EDITAR ÍTEM ── */}
      {editItem && (
        <ScrollView style={[styles.panelFull, styles.panelEdit]} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.panelContent} nestedScrollEnabled>
          <View style={styles.panelTituloRow}>
            <Pencil size={16} color="#1565C0" />
            <Text style={styles.panelTitulo}>Editar refacción</Text>
          </View>
          <Text style={styles.panelLabel}>NOMBRE</Text>
          <TextInput style={styles.panelInput} value={editNombre}
            onChangeText={v => { setEditNombre(v); setEditError(''); }}
            placeholder="Nombre de la refacción" placeholderTextColor="#bbb" />
          <Text style={[styles.panelLabel, { marginTop: 14 }]}>EXISTENCIA (corrección)</Text>
          <TextInput style={[styles.panelInput, { width: 90 }]} value={editCantidad}
            onChangeText={setEditCantidad} keyboardType="numeric" selectTextOnFocus />
          <Text style={styles.correccionHint}>Establece la cantidad real actual (sin crear movimiento).</Text>
          {esMinividas && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 14 }]}>CATEGORÍA</Text>
              <View style={styles.razonesWrap}>
                {CATEGORIAS_MINIVIDAS.map(cat => (
                  <TouchableOpacity key={cat}
                    style={[styles.razonChip, editCategoria === cat && styles.razonChipActiveAzul]}
                    onPress={() => setEditCategoria(cat)}>
                    <Text style={[styles.razonChipText, editCategoria === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Text style={[styles.panelLabel, { marginTop: 14 }]}>FOTOGRAFÍA</Text>
          {editFoto ? (
            <>
              <ImagenViewer uri={editFoto}>
                <Image source={{ uri: editFoto }} style={styles.fotoPreview} resizeMode="cover" />
              </ImagenViewer>
              <TouchableOpacity style={[styles.fotoQuitarBtn, styles.fotoQuitarRow]} onPress={() => setEditFoto('')}>
                <Trash2 size={13} color="#C62828" />
                <Text style={styles.fotoQuitarText}>Quitar foto</Text>
              </TouchableOpacity>
            </>
          ) : <FotoButtons onFoto={setEditFoto} />}
          {!!editError && (
            <View style={styles.panelErrorRow}><AlertTriangle size={13} color="#C62828" /><Text style={styles.panelError}>{editError}</Text></View>
          )}
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditItem(null)} disabled={editGuardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#1565C0' }]} onPress={guardarEdicion} disabled={editGuardando}>
              {editGuardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
          {!confirmDelete
            ? <TouchableOpacity style={[styles.btnEliminarItem, styles.btnEliminarItemRow]} onPress={() => setConfirmDelete(true)}>
                <Trash2 size={14} color="#C62828" />
                <Text style={styles.btnEliminarItemText}>Eliminar del inventario</Text>
              </TouchableOpacity>
            : <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>¿Eliminar "{editItem.nombre}"?</Text>
                <View style={styles.panelBtns}>
                  <TouchableOpacity style={styles.btnCancelar} onPress={() => setConfirmDelete(false)}>
                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#C62828' }]} onPress={eliminarItem} disabled={editGuardando}>
                    {editGuardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Eliminar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
          }
        </ScrollView>
      )}

      {/* ── PANEL: RETIRO ── */}
      {retiroPanel === 'salida' && (
        <View style={[styles.panelFull, styles.panelRetiro]}>
          <View style={styles.panelTituloRow}>
            <Upload size={16} color="#E65100" />
            <Text style={styles.panelTitulo}>Dar salida a toda la cajuela</Text>
          </View>
          <Text style={styles.retiroInfoText}>
            La cajuela quedará marcada como <Text style={{ fontWeight: '800' }}>EN SERVICIO</Text> hasta que se registre su devolución.
          </Text>
          <View style={styles.retiroUserBox}>
            <Text style={styles.retiroUserLabel}>RESPONSABLE</Text>
            <View style={styles.retiroUserNombreRow}>
              <User size={15} color="#1a1a2e" />
              <Text style={styles.retiroUserNombre}>{perfil?.nombre || perfil?.email || 'Usuario actual'}</Text>
            </View>
          </View>
          {!!retiroError && (
            <View style={styles.panelErrorRow}><AlertTriangle size={13} color="#C62828" /><Text style={styles.panelError}>{retiroError}</Text></View>
          )}
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setRetiroPanel(null)} disabled={procesandoRetiro}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#E65100' }]} onPress={confirmarSalidaCajuela} disabled={procesandoRetiro}>
              {procesandoRetiro ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Confirmar salida</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {retiroPanel === 'devolucion' && (
        <View style={[styles.panelFull, styles.panelDevolucion]}>
          <View style={styles.panelTituloRow}>
            <Download size={16} color="#1565C0" />
            <Text style={styles.panelTitulo}>Registrar devolución</Text>
          </View>
          {retiroActivo && (
            <View style={styles.retiroUserBox}>
              <Text style={styles.retiroUserLabel}>RETIRADO POR</Text>
              <View style={styles.retiroUserNombreRow}>
                <User size={15} color="#1a1a2e" />
                <Text style={styles.retiroUserNombre}>{retiroActivo.usuarioNombre}</Text>
              </View>
              <Text style={styles.retiroUserFecha}>Salida: {formatFechaCorta(retiroActivo.fechaRetiro)}</Text>
            </View>
          )}
          <Text style={styles.devolucionPregunta}>¿Se utilizó alguna pieza de esta cajuela?</Text>
          {!!retiroError && (
            <View style={styles.panelErrorRow}><AlertTriangle size={13} color="#C62828" /><Text style={styles.panelError}>{retiroError}</Text></View>
          )}
          <TouchableOpacity
            style={[styles.devolucionBtn, { backgroundColor: '#2E7D32' }]}
            onPress={confirmarDevolucionConPiezas}
            disabled={procesandoRetiro}
          >
            {procesandoRetiro ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <CheckCircle2 size={26} color="#fff" />
                <View>
                  <Text style={styles.devolucionBtnTitulo}>Sí, registrar piezas usadas</Text>
                  <Text style={styles.devolucionBtnSub}>Ir a movimientos de refacciones</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.devolucionBtn, { backgroundColor: '#1565C0' }]}
            onPress={confirmarDevolucionSinPiezas}
            disabled={procesandoRetiro}
          >
            {procesandoRetiro ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Package size={26} color="#fff" />
                <View>
                  <Text style={styles.devolucionBtnTitulo}>No, todo completo</Text>
                  <Text style={styles.devolucionBtnSub}>Devolver sin cambios en inventario</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnCancelar, { marginTop: 10 }]} onPress={() => setRetiroPanel(null)} disabled={procesandoRetiro}>
            <Text style={styles.btnCancelarText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          CONTENIDO NORMAL (sin panel)
          ══════════════════════════════════════════════════════════ */}
      {!anyPanelOpen && (
        <>
          {/* Tabs */}
          <View style={styles.tabsBar}>
            {['inventario', 'movimientos'].map(t => (
              <TouchableOpacity key={t} style={[styles.tabBtn2, styles.tabBtn2Row, tab === t && styles.tabBtn2Active]} onPress={() => setTab(t)}>
                {t === 'inventario'
                  ? <Package size={14} color={tab === t ? AZUL : '#aaa'} />
                  : <ClipboardList size={14} color={tab === t ? AZUL : '#aaa'} />
                }
                <Text style={[styles.tabText2, tab === t && styles.tabText2Active]}>
                  {t === 'inventario' ? 'Inventario' : 'Movimientos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Banner retiro activo / Botón dar salida */}
          {retiroActivo === undefined ? null : retiroActivo ? (
            <View style={styles.retiroBanner}>
              <View style={styles.retiroBannerLeft}>
                <Siren size={20} color="#fff" />
                <View>
                  <Text style={styles.retiroBannerTitle}>EN SERVICIO</Text>
                  <Text style={styles.retiroBannerSub}>
                    {retiroActivo.usuarioNombre} · desde {formatFechaCorta(retiroActivo.fechaRetiro)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.retiroDevBtn, styles.retiroDevBtnRow]} onPress={() => setRetiroPanel('devolucion')}>
                <Download size={13} color="#fff" />
                <Text style={styles.retiroDevBtnText}>Devolver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.darSalidaBtn, styles.darSalidaRow]} onPress={() => setRetiroPanel('salida')}>
              <Upload size={14} color="#E65100" />
              <Text style={styles.darSalidaText}>Dar salida a toda la cajuela</Text>
            </TouchableOpacity>
          )}

          {/* Inventario */}
          {tab === 'inventario' ? (
            esMinividas ? (
              <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
                {inventario.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Package size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Sin refacciones en inventario.</Text>
                    <Text style={styles.emptyHint}>Usa "Entrada" para agregar refacciones.</Text>
                  </View>
                ) : CATEGORIAS_MINIVIDAS.map(cat => {
                  const items = inventario.filter(i => (i.categoria || categorizarMinividas(i.nombre)) === cat);
                  if (items.length === 0) return null;
                  return (
                    <View key={cat}>
                      <View style={styles.grupoHeaderCajuela}>
                        <Text style={styles.grupoNombreCajuela}>{cat}</Text>
                        <View style={styles.grupoBadge}><Text style={styles.grupoBadgeText}>{items.length}</Text></View>
                      </View>
                      {items.map(item => <InvCard key={item.id} item={item} onEdit={abrirEdicion} />)}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <FlatList
                data={inventario}
                keyExtractor={i => i.id}
                renderItem={({ item }) => <InvCard item={item} onEdit={abrirEdicion} />}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Package size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Sin refacciones en inventario.</Text>
                    <Text style={styles.emptyHint}>Usa "Entrada" para agregar refacciones.</Text>
                  </View>
                }
                contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
              />
            )
          ) : (
            /* Movimientos */
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
              {totalSalidas > 0 && (
                <View style={styles.statsBox}>
                  <View style={styles.statsTitleRow}>
                    <BarChart3 size={15} color="#1a1a2e" />
                    <Text style={styles.statsTitle}>Estadísticas de uso</Text>
                  </View>
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
                ? <View style={styles.emptyBox}>
                    <ClipboardList size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Sin movimientos registrados.</Text>
                  </View>
                : movimientos.map(m => {
                  if (m.tipo === 'retiro' || m.tipo === 'devolucion') {
                    const esRetiro = m.tipo === 'retiro';
                    return (
                      <View key={m.id} style={[styles.movCard, { borderLeftColor: esRetiro ? '#E65100' : '#1565C0' }]}>
                        <View style={styles.movTop}>
                          <View style={[styles.tipoBadge, styles.tipoBadgeRow, { backgroundColor: esRetiro ? '#FFF3E0' : '#E3F2FD' }]}>
                            {esRetiro
                              ? <Upload size={11} color="#E65100" />
                              : <Download size={11} color="#1565C0" />
                            }
                            <Text style={[styles.tipoText, { color: esRetiro ? '#E65100' : '#1565C0' }]}>
                              {esRetiro ? 'RETIRO DE CAJUELA' : 'DEVOLUCIÓN DE CAJUELA'}
                            </Text>
                          </View>
                        </View>
                        {!esRetiro && (
                          <Text style={styles.movNombre}>
                            {m.piezasUsadas ? 'Se usaron piezas de la cajuela' : 'Sin piezas usadas'}
                          </Text>
                        )}
                        <View style={styles.movMeta}>
                          {m.usuario ? (
                            <View style={[styles.usuarioBadge, styles.usuarioBadgeRow]}>
                              <User size={11} color="#444" /><Text style={styles.usuarioText}>{m.usuario}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.movFecha}>{formatFecha(m.creadoEn)}</Text>
                        </View>
                      </View>
                    );
                  }
                  const esEntrada = m.tipo === 'entrada';
                  const razonObj = RAZONES_CAJUELA.find(r => r.id === m.razon);
                  return (
                    <View key={m.id} style={[styles.movCard, { borderLeftColor: esEntrada ? '#4CAF50' : '#F44336' }]}>
                      <View style={styles.movTop}>
                        <View style={[styles.tipoBadge, styles.tipoBadgeRow, esEntrada ? styles.tipoBadgeE : styles.tipoBadgeS]}>
                          {esEntrada
                            ? <ArrowUp size={11} color="#2E7D32" />
                            : <ArrowDown size={11} color="#C62828" />
                          }
                          <Text style={[styles.tipoText, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                            {esEntrada ? 'ENTRADA' : 'USO'}
                          </Text>
                        </View>
                        <Text style={[styles.movCant, { color: esEntrada ? '#2E7D32' : '#C62828' }]}>
                          {esEntrada ? '+' : '-'}{m.cantidad} pz
                        </Text>
                      </View>
                      <Text style={styles.movNombre}>{m.nombre}</Text>
                      {m.foto ? (
                        <ImagenViewer uri={m.foto}>
                          <Image source={{ uri: m.foto }} style={styles.movFoto} resizeMode="cover" />
                        </ImagenViewer>
                      ) : null}
                      {razonObj && (
                        <View style={[styles.razonTag, { backgroundColor: COLORES_RAZON[m.razon] + '22' }]}>
                          <Text style={[styles.razonTagText, { color: COLORES_RAZON[m.razon] }]}>{razonObj.label}</Text>
                        </View>
                      )}
                      {m.motivo ? (
                        <View style={styles.movMotivoRow}>
                          <MessageCircle size={12} color="#555" />
                          <Text style={styles.movMotivo}>{m.motivo}</Text>
                        </View>
                      ) : null}
                      <View style={styles.movMeta}>
                        {m.usuario ? (
                          <View style={[styles.usuarioBadge, styles.usuarioBadgeRow]}>
                            <User size={11} color="#444" /><Text style={styles.usuarioText}>{m.usuario}</Text>
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
          <View style={styles.fabs}>
            <TouchableOpacity style={[styles.fab, styles.fabE, styles.fabRow]} onPress={() => abrirPanel('entrada')}>
              <ArrowUp size={16} color="#fff" />
              <Text style={styles.fabText}>Entrada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fab, styles.fabS, styles.fabRow]} onPress={() => abrirPanel('salida')}>
              <ArrowDown size={16} color="#fff" />
              <Text style={styles.fabText}>Uso</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const AZUL = '#085686'; // DISA blue
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volverRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  cajuelaFotoBtn: { position: 'relative' },
  cajuelaFotoImg: { width: 56, height: 56, borderRadius: 14 },
  cajuelaFotoPh: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  cajuelaFotoCam: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 3 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  tabTextActive: { color: AZUL },

  // Tabs bar (debajo del header cuando no hay panel)
  tabsBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8eaed' },
  tabBtn2: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtn2Row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabBtn2Active: { borderBottomColor: AZUL },
  tabText2: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  tabText2Active: { color: AZUL },

  // Paneles full-screen
  panelFull: { flex: 1 },
  panelContent: { padding: 18, paddingBottom: 30 },
  panelE: { backgroundColor: '#E8F5E9' },
  panelS: { backgroundColor: '#FFF3E0' },
  panelEdit: { backgroundColor: '#E3F2FD' },
  panelRetiro: { backgroundColor: '#FFF3E0', padding: 20 },
  panelDevolucion: { backgroundColor: '#E8F5E9', padding: 20 },
  panelTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  panelTitulo: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  panelLabel: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },

  // Retiro panel
  retiroInfoText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 },
  retiroUserBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  retiroUserLabel: { fontSize: 10, fontWeight: '800', color: '#aaa', letterSpacing: 0.5, marginBottom: 4 },
  retiroUserNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retiroUserNombre: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  retiroUserFecha: { fontSize: 12, color: '#888', marginTop: 4 },

  // Devolución panel
  devolucionPregunta: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 18, lineHeight: 22 },
  devolucionBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, marginBottom: 10 },
  devolucionBtnTitulo: { color: '#fff', fontWeight: '800', fontSize: 15 },
  devolucionBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  // Banner retiro activo
  retiroBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E53935', paddingHorizontal: 14, paddingVertical: 10 },
  retiroBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  retiroBannerTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  retiroBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  retiroDevBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  retiroDevBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  retiroDevBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Botón dar salida
  darSalidaBtn: { marginHorizontal: 14, marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: '#E65100', borderStyle: 'dashed' },
  darSalidaRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  darSalidaText: { color: '#E65100', fontWeight: '700', fontSize: 14 },

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
  selNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  selNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  selXRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10 },
  selX: { fontSize: 12, color: '#888', fontWeight: '600' },

  // Foto
  fotoPreview: { width: '100%', height: 130, borderRadius: 10, backgroundColor: '#e0e0e0' },
  fotoQuitarBtn: { marginTop: 6, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 4 },
  fotoQuitarRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 12 },
  fotoBtnsRow: { flexDirection: 'row', gap: 8 },
  fotoAddBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  fotoAddText: { fontSize: 11, color: '#888', fontWeight: '600' },

  // Razones
  razonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  razonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  razonChipActiveAzul: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  razonChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  correccionHint: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 4 },

  // Botones
  btnCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelarText: { color: '#555', fontWeight: '700' },
  btnConfirmar: { flex: 2, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnEliminarItem: { marginTop: 12, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  btnEliminarItemRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  btnEliminarItemText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  confirmBox: { marginTop: 10, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FFCC80' },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 10 },

  // Grupos por categoría (MINIVIDAS)
  grupoHeaderCajuela: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 4 },
  grupoNombreCajuela: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5 },
  grupoBadge: { backgroundColor: AZUL, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  grupoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

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

  // Stats
  statsBox: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  statsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statsTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
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
  tipoBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipoBadgeE: { backgroundColor: '#E8F5E9' },
  tipoBadgeS: { backgroundColor: '#FFEBEE' },
  tipoText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  movCant: { fontSize: 18, fontWeight: '900' },
  movNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  movFoto: { width: '100%', height: 120, borderRadius: 10, marginBottom: 8, backgroundColor: '#e0e0e0' },
  razonTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  razonTagText: { fontSize: 12, fontWeight: '700' },
  movMotivoRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  movMotivo: { fontSize: 13, color: '#555', fontStyle: 'italic', flex: 1 },
  movMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  usuarioBadge: { backgroundColor: '#EEF2F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  usuarioBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  usuarioText: { fontSize: 12, fontWeight: '700', color: '#444' },
  movFecha: { fontSize: 11, color: '#bbb' },

  // FABs
  fabs: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', gap: 12 },
  fab: { flex: 1, borderRadius: 14, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 4 },
  fabRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  fabE: { backgroundColor: '#2E7D32' },
  fabS: { backgroundColor: '#C62828' },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
