import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import {
  ArrowLeft, Monitor, Trash2, Package, Upload, CheckCircle2, Hourglass,
  Nut, Pencil, AlertTriangle, ArrowUp, ArrowDown, MessageCircle,
  Skull, Wrench, Handshake, ClipboardCheck, XCircle, User, Plus,
} from 'lucide-react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import {
  getEquipo, deleteEquipo, suscribirEquipoMovimientos, addEquipoMovimiento,
  addEquipoSalidaCompleta, CLASIFICACIONES_SALIDA_EQUIPO, marcarRevisionEquipo,
  AREAS_EQUIPO, marcarEquipoValidado, suscribirEquipoValidacionNotas, addEquipoValidacionNota,
} from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import ImagenViewer from '../components/ImagenViewer';

const CLASIF_MAP = {
  hueso: { label: 'Hueso', icon: Skull, color: '#E53935' },
  reacondicionamiento: { label: 'Reacondicionamiento', icon: Wrench, color: '#1565C0' },
  prestamo: { label: 'Préstamo', icon: Handshake, color: '#2E7D32' },
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

  // Salida de equipo completo (desecho / almacén)
  const [salidaPanelAbierto, setSalidaPanelAbierto] = useState(false);
  const [salidaClasificacion, setSalidaClasificacion] = useState('');
  const [guardandoSalida, setGuardandoSalida] = useState(false);
  const [salidaError, setSalidaError] = useState('');

  // Revisión
  const [guardandoRev, setGuardandoRev] = useState(false);

  // Validación (solo equipos del área "validación")
  const [guardandoValidacion, setGuardandoValidacion] = useState(false);
  const [notasValidacion, setNotasValidacion] = useState([]);
  const [notaValidacion, setNotaValidacion] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEquipo(id)
      .then(setEquipo)
      .catch(() => setError('No se pudo cargar el equipo.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Refacciones del equipo: no aplica a equipos de Validación, así que ni se suscribe.
  useEffect(() => {
    if (!id || equipo?.area === 'validacion') return;
    return suscribirEquipoMovimientos(id, setMovimientos);
  }, [id, equipo?.area]);

  useEffect(() => {
    if (!id || equipo?.area !== 'validacion') return;
    return suscribirEquipoValidacionNotas(id, setNotasValidacion);
  }, [id, equipo?.area]);

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

  const abrirSalidaPanel = () => {
    setSalidaClasificacion('');
    setSalidaError('');
    setSalidaPanelAbierto(true);
  };

  const confirmarSalidaEquipo = async () => {
    if (!salidaClasificacion) { setSalidaError('Selecciona una clasificación.'); return; }
    setGuardandoSalida(true);
    try {
      await addEquipoSalidaCompleta(id, salidaClasificacion, perfil);
      setEquipo(prev => ({
        ...prev,
        estadoSalida: salidaClasificacion,
        fechaSalida: new Date().toISOString(),
        salidaPor: perfil?.nombre || perfil?.email || 'Sistema',
      }));
      setSalidaPanelAbierto(false);
    } catch {
      setSalidaError('Error al guardar. Intenta de nuevo.');
    }
    setGuardandoSalida(false);
  };

  const cambiarRevision = async (revisada) => {
    setGuardandoRev(true);
    try {
      const cambios = await marcarRevisionEquipo(id, revisada, perfil);
      setEquipo(prev => ({ ...prev, ...cambios }));
    } catch {}
    setGuardandoRev(false);
  };

  const cambiarValidacion = async (validado) => {
    setGuardandoValidacion(true);
    try {
      const cambios = await marcarEquipoValidado(id, validado, perfil);
      setEquipo(prev => ({ ...prev, ...cambios }));
    } catch {}
    setGuardandoValidacion(false);
  };

  const agregarNotaValidacion = async () => {
    if (!notaValidacion.trim()) return;
    setGuardandoNota(true);
    try {
      await addEquipoValidacionNota(id, notaValidacion, perfil);
      setNotaValidacion('');
    } catch {}
    setGuardandoNota(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} color="#1976D2" /><Text style={{ color: '#1976D2' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const revisada = equipo.estadoRevision === 'revisada';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.volverRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.volver}>Equipos</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.equipoIconGrande}>
            <Monitor size={36} color="#fff" />
          </View>
          <Text style={styles.headerModelo}>{equipo.modelo}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {equipo.area && (
              <View style={[styles.fabBadge, styles.fabBadgeRow]}>
                {equipo.area === 'validacion' ? <ClipboardCheck size={12} color="#fff" /> : <Wrench size={12} color="#fff" />}
                <Text style={styles.fabBadgeText}>{AREAS_EQUIPO.find(a => a.id === equipo.area)?.label || equipo.area}</Text>
              </View>
            )}
            {equipo.fabricante && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{equipo.fabricante.toUpperCase()}</Text>
              </View>
            )}
            {equipo.clasificacion && CLASIF_MAP[equipo.clasificacion] && (
              <View style={[styles.fabBadge, styles.fabBadgeRow, { backgroundColor: CLASIF_MAP[equipo.clasificacion].color }]}>
                {React.createElement(CLASIF_MAP[equipo.clasificacion].icon, { size: 12, color: '#fff' })}
                <Text style={styles.fabBadgeText}>{CLASIF_MAP[equipo.clasificacion].label}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Banner de salida de equipo completo */}
        {equipo.estadoSalida && (
          <View style={[styles.salidaBanner, equipo.estadoSalida === 'desecho' ? styles.salidaBannerDesecho : styles.salidaBannerAlmacen]}>
            {equipo.estadoSalida === 'desecho' ? <Trash2 size={24} color="#616161" /> : <Package size={24} color="#00838F" />}
            <View style={{ flex: 1 }}>
              <Text style={styles.salidaBannerTitle}>
                EQUIPO DADO DE SALIDA — {equipo.estadoSalida === 'desecho' ? 'DESECHO' : 'ALMACÉN'}
              </Text>
              <Text style={styles.salidaBannerSub}>
                {equipo.salidaPor} · {formatFecha(equipo.fechaSalida)}
              </Text>
            </View>
          </View>
        )}

        {/* Panel salida de equipo completo */}
        {salidaPanelAbierto && (
          <View style={[styles.panel, styles.panelSalidaEquipo]}>
            <View style={styles.panelTitRow}>
              <Upload size={14} color="#E65100" />
              <Text style={styles.panelTit}>Dar salida al equipo completo</Text>
            </View>
            <Text style={styles.panelLbl}>CLASIFICACIÓN *</Text>
            <View style={styles.salidaChipsWrap}>
              {CLASIFICACIONES_SALIDA_EQUIPO.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.salidaChip, salidaClasificacion === c.id && styles.salidaChipActive]}
                  onPress={() => { setSalidaClasificacion(c.id); setSalidaError(''); }}
                >
                  <Text style={[styles.salidaChipText, salidaClasificacion === c.id && styles.salidaChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!salidaError && (
              <View style={styles.panelErrorRow}>
                <AlertTriangle size={13} color="#C62828" />
                <Text style={styles.panelError}>{salidaError}</Text>
              </View>
            )}
            <View style={styles.panelBtns}>
              <TouchableOpacity style={styles.panelCancelar} onPress={() => setSalidaPanelAbierto(false)} disabled={guardandoSalida}>
                <Text style={styles.panelCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.panelConfirmar, { backgroundColor: '#E65100' }]} onPress={confirmarSalidaEquipo} disabled={guardandoSalida}>
                {guardandoSalida
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.panelConfirmarText}>Confirmar salida</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Revisión (no aplica a equipos de Validación: ahí el estado es Validado/No validado) */}
        {equipo.area !== 'validacion' && (
          <View style={[styles.revBox, revisada ? styles.revBoxOk : styles.revBoxPend]}>
            <View style={{ flex: 1 }}>
              <View style={styles.revEstadoRow}>
                {revisada ? <CheckCircle2 size={15} color="#2E7D32" /> : <Hourglass size={15} color="#E65100" />}
                <Text style={[styles.revEstado, { color: revisada ? '#2E7D32' : '#E65100' }]}>
                  {revisada ? 'Revisado' : 'Pendiente de revisar'}
                </Text>
              </View>
              {revisada && equipo.revisadaPor ? (
                <Text style={styles.revSub}>{equipo.revisadaPor} · {formatFecha(equipo.revisadaEn)}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.revBtn, revisada ? styles.revBtnPend : styles.revBtnOk]}
              onPress={() => cambiarRevision(!revisada)}
              disabled={guardandoRev}
            >
              {guardandoRev
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.revBtnText}>{revisada ? 'Marcar pendiente' : 'Marcar revisado'}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Validación (solo equipos del área Validación) */}
        {equipo.area === 'validacion' && (
          <>
            <View style={[styles.revBox, equipo.estadoValidacion === 'validado' ? styles.revBoxOk : styles.revBoxPend]}>
              <View style={{ flex: 1 }}>
                <View style={styles.revEstadoRow}>
                  {equipo.estadoValidacion === 'validado'
                    ? <CheckCircle2 size={15} color="#2E7D32" />
                    : <XCircle size={15} color="#E65100" />
                  }
                  <Text style={[styles.revEstado, { color: equipo.estadoValidacion === 'validado' ? '#2E7D32' : '#E65100' }]}>
                    {equipo.estadoValidacion === 'validado' ? 'Validado' : 'No validado'}
                  </Text>
                </View>
                {equipo.estadoValidacion === 'validado' && equipo.validadoPor ? (
                  <Text style={styles.revSub}>{equipo.validadoPor} · {formatFecha(equipo.validadoEn)}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.revBtn, equipo.estadoValidacion === 'validado' ? styles.revBtnPend : styles.revBtnOk]}
                onPress={() => cambiarValidacion(equipo.estadoValidacion !== 'validado')}
                disabled={guardandoValidacion}
              >
                {guardandoValidacion
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.revBtnText}>{equipo.estadoValidacion === 'validado' ? 'Marcar no validado' : 'Marcar validado'}</Text>
                }
              </TouchableOpacity>
            </View>

            <View style={styles.seccion}>
              <View style={styles.panelTitRow}>
                <ClipboardCheck size={14} color="#1a1a2e" />
                <Text style={styles.movTitulo}>Pruebas realizadas / comentarios</Text>
              </View>
              <TextInput
                style={[styles.panelInput, styles.notaValidacionInput]}
                value={notaValidacion}
                onChangeText={setNotaValidacion}
                placeholder="Describe las pruebas realizadas o deja un comentario..."
                placeholderTextColor="#bbb"
                multiline
              />
              <TouchableOpacity
                style={[styles.btnAgregarNota, styles.btnRow]}
                onPress={agregarNotaValidacion}
                disabled={guardandoNota || !notaValidacion.trim()}
              >
                {guardandoNota
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Plus size={14} color="#fff" /><Text style={styles.btnAgregarNotaText}>Agregar</Text></>
                }
              </TouchableOpacity>

              {notasValidacion.length === 0
                ? <Text style={styles.movVacio}>Sin comentarios registrados.</Text>
                : notasValidacion.map(n => (
                  <View key={n.id} style={styles.notaCard}>
                    <View style={styles.notaCardHeaderRow}>
                      <User size={11} color="#666" />
                      <Text style={styles.notaCardUsuario}>{n.usuario}</Text>
                      <Text style={styles.notaCardFecha}>{formatFecha(n.creadoEn)}</Text>
                    </View>
                    <Text style={styles.notaCardTexto}>{n.texto}</Text>
                  </View>
                ))
              }
            </View>
          </>
        )}

        {/* Foto */}
        {equipo.foto ? (
          <ImagenViewer uri={equipo.foto}>
            <Image source={{ uri: equipo.foto }} style={styles.foto} resizeMode="cover" />
          </ImagenViewer>
        ) : null}

        {/* Detalles */}
        <View style={styles.seccion}>
          <Fila label="Modelo" valor={equipo.modelo} />
          <Fila label="Área" valor={AREAS_EQUIPO.find(a => a.id === equipo.area)?.label || 'Sin clasificar'} />
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

        {/* Refacciones en este equipo (no aplica a equipos de Validación) */}
        {equipo.area !== 'validacion' && (
        <View style={styles.seccion}>
          <View style={styles.movHeader}>
            <View style={styles.panelTitRow}>
              <Nut size={14} color="#1a1a2e" />
              <Text style={styles.movTitulo}>Refacciones del equipo</Text>
            </View>
            <Text style={styles.movCount}>{movimientos.length} mov.</Text>
          </View>

          {/* Panel nuevo movimiento */}
          {panelAbierto && (
            <View style={[styles.panel, panelTipo === 'entrada' ? styles.panelE : styles.panelS]}>
              <View style={styles.panelTitRow}>
                {panelTipo === 'entrada' ? <ArrowUp size={14} color="#2E7D32" /> : <ArrowDown size={14} color="#C62828" />}
                <Text style={styles.panelTit}>{panelTipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}</Text>
              </View>
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
              {!!movError && (
                <View style={styles.panelErrorRow}>
                  <AlertTriangle size={13} color="#C62828" />
                  <Text style={styles.panelError}>{movError}</Text>
                </View>
              )}
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
              <TouchableOpacity style={[styles.movFab, styles.movFabRow, { backgroundColor: '#2E7D32' }]} onPress={() => abrirPanel('entrada')}>
                <ArrowUp size={14} color="#fff" />
                <Text style={styles.movFabText}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.movFab, styles.movFabRow, { backgroundColor: '#C62828' }]} onPress={() => abrirPanel('salida')}>
                <ArrowDown size={14} color="#fff" />
                <Text style={styles.movFabText}>Salida</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de movimientos */}
          {movimientos.length === 0
            ? <Text style={styles.movVacio}>Sin movimientos registrados.</Text>
            : movimientos.map(m => {
              if (m.tipo === 'salida_equipo') {
                return (
                  <View key={m.id} style={[styles.movCard, { borderLeftColor: '#E65100' }]}>
                    <View style={styles.movTipoRow}>
                      <Upload size={11} color="#E65100" />
                      <Text style={[styles.movTipo, { color: '#E65100' }]}>
                        SALIDA DE EQUIPO — {m.clasificacionSalida === 'desecho' ? 'DESECHO' : 'ALMACÉN'}
                      </Text>
                    </View>
                    <Text style={styles.movFecha}>{m.usuario} · {formatFecha(m.creadoEn)}</Text>
                  </View>
                );
              }
              return (
                <View key={m.id} style={[styles.movCard, { borderLeftColor: m.tipo === 'entrada' ? '#4CAF50' : '#F44336' }]}>
                  <View style={styles.movTop}>
                    <View style={styles.movTipoRow}>
                      {m.tipo === 'entrada' ? <ArrowUp size={11} color="#2E7D32" /> : <ArrowDown size={11} color="#C62828" />}
                      <Text style={[styles.movTipo, { color: m.tipo === 'entrada' ? '#2E7D32' : '#C62828' }]}>
                        {m.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                      </Text>
                    </View>
                    <Text style={[styles.movCant, { color: m.tipo === 'entrada' ? '#2E7D32' : '#C62828' }]}>
                      {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad} pz
                    </Text>
                  </View>
                  <Text style={styles.movNom}>{m.nombre}</Text>
                  {m.nota ? (
                    <View style={styles.movNotaRow}>
                      <MessageCircle size={11} color="#666" />
                      <Text style={styles.movNota}>{m.nota}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.movFecha}>{formatFecha(m.creadoEn)}</Text>
                </View>
              );
            })
          }
        </View>
        )}

        {/* Botones de acción */}
        {!equipo.estadoSalida && !salidaPanelAbierto && (
          <TouchableOpacity style={[styles.btnSalidaEquipo, styles.btnRow]} onPress={abrirSalidaPanel}>
            <Upload size={15} color="#E65100" />
            <Text style={styles.btnSalidaEquipoText}>Dar salida al equipo completo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btnEditar, styles.btnRow]}
          onPress={() => navigation.navigate('FormEquipo', { id, equipo })}
        >
          <Pencil size={15} color="#fff" />
          <Text style={styles.btnEditarText}>Editar equipo</Text>
        </TouchableOpacity>

        {/* Eliminar */}
        {!confirmEliminar ? (
          <TouchableOpacity style={[styles.btnEliminar, styles.btnRow]} onPress={() => setConfirmEliminar(true)}>
            <Trash2 size={15} color="#C62828" />
            <Text style={styles.btnEliminarText}>Eliminar equipo</Text>
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

const AZUL = '#085686'; // DISA blue
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50, paddingBottom: 24, alignItems: 'flex-start' },
  volverRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  headerContent: { alignSelf: 'stretch', alignItems: 'center' },
  equipoIconGrande: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  headerModelo: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  fabBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  fabBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fabBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  foto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#e0e0e0' },
  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  // Revisión
  revBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1 },
  revBoxOk: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  revBoxPend: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  revEstadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revEstado: { fontSize: 15, fontWeight: '800' },
  revSub: { fontSize: 12, color: '#666', marginTop: 3 },
  revBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 120, alignItems: 'center' },
  revBtnOk: { backgroundColor: '#2E7D32' },
  revBtnPend: { backgroundColor: '#E65100' },
  revBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  // Movimientos section
  movHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  movTitulo: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  movCount: { fontSize: 12, color: '#888' },
  movFabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  movFab: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  movFabRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  movFabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  movCard: { borderLeftWidth: 4, backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, marginBottom: 8 },
  movTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  movTipoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  movTipo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  movCant: { fontSize: 16, fontWeight: '900' },
  movNom: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  movNotaRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  movNota: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  movFecha: { fontSize: 11, color: '#bbb', marginTop: 4 },
  movVacio: { color: '#aaa', fontSize: 13, textAlign: 'center', marginVertical: 12 },
  // Validación
  notaValidacionInput: { minHeight: 70, textAlignVertical: 'top', marginBottom: 10 },
  btnAgregarNota: { backgroundColor: AZUL, borderRadius: 10, padding: 12, marginBottom: 14 },
  btnAgregarNotaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  notaCard: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, marginBottom: 8 },
  notaCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  notaCardUsuario: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  notaCardFecha: { fontSize: 11, color: '#aaa' },
  notaCardTexto: { fontSize: 13, color: '#444', lineHeight: 19 },
  // Panel
  panel: { borderRadius: 12, padding: 14, marginBottom: 14 },
  panelE: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  panelS: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  panelTitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  panelTit: { fontSize: 13, fontWeight: '800', color: '#1a1a2e' },
  panelLbl: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 5 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  panelCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  panelCancelarText: { color: '#555', fontWeight: '700' },
  panelConfirmar: { flex: 2, borderRadius: 10, padding: 10, alignItems: 'center' },
  panelConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Salida de equipo completo
  salidaBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 16 },
  salidaBannerDesecho: { backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#9E9E9E' },
  salidaBannerAlmacen: { backgroundColor: '#E0F7FA', borderWidth: 1.5, borderColor: '#00838F' },
  salidaBannerTitle: { fontSize: 13, fontWeight: '800', color: '#1a1a2e' },
  salidaBannerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  panelSalidaEquipo: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  salidaChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  salidaChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  salidaChipActive: { backgroundColor: '#E65100', borderColor: '#E65100' },
  salidaChipText: { fontSize: 13, fontWeight: '700', color: '#555' },
  salidaChipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnSalidaEquipo: { backgroundColor: '#fff', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#E65100', borderStyle: 'dashed' },
  btnSalidaEquipoText: { color: '#E65100', fontWeight: '700', fontSize: 15 },
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
