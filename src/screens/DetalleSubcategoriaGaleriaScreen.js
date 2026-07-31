import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirGaleriaImagenes, addGaleriaImagen, deleteGaleriaImagen } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';
import { seleccionarFoto } from '../utils/fotoHelper';
import { mostrarAlerta } from '../utils/confirmar';
import ImagenViewer from '../components/ImagenViewer';

function formatFecha(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function DetalleSubcategoriaGaleriaScreen({ navigation, route }) {
  const { subcategoriaId, nombre } = route?.params || {};
  const { perfil } = useAuth();
  const puedeAdministrar = esAdmin(perfil);

  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [foto, setFoto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subcategoriaId) return;
    const unsub = suscribirGaleriaImagenes(subcategoriaId, data => { setImagenes(data); setLoading(false); });
    return unsub;
  }, [subcategoriaId]);

  const abrirNueva = () => { setFoto(''); setNota(''); setError(''); setPanelAbierto(true); };

  const confirmarNueva = async () => {
    if (!foto) { setError('Selecciona una fotografía.'); return; }
    setGuardando(true);
    try {
      await addGaleriaImagen(subcategoriaId, foto, nota, perfil);
      setPanelAbierto(false);
    } catch { setError('Error al guardar. Intenta de nuevo.'); }
    setGuardando(false);
  };

  const confirmarEliminar = (imagen) => {
    mostrarAlerta(
      'ELIMINAR IMAGEN',
      '¿ELIMINAR ESTA IMAGEN DE LA GALERÍA?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'ELIMINAR', style: 'destructive', onPress: () => deleteGaleriaImagen(imagen.id).catch(() => {}) },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>🖼️ {nombre}</Text>
      </View>

      {puedeAdministrar && !panelAbierto && (
        <TouchableOpacity style={styles.nuevaBtn} onPress={abrirNueva}>
          <Text style={styles.nuevaBtnText}>+ Agregar imagen</Text>
        </TouchableOpacity>
      )}

      {panelAbierto && (
        <ScrollView style={styles.panel} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.panelLabel}>FOTOGRAFÍA *</Text>
          {foto ? (
            <>
              <Image source={{ uri: foto }} style={styles.fotoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setFoto('')}>
                <Text style={styles.fotoQuitarText}>🗑️ Quitar foto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.fotoBtnsRow}>
              <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(setFoto, 'camara')}>
                <Text style={styles.fotoAddIcon}>📷</Text>
                <Text style={styles.fotoAddText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(setFoto, 'galeria')}>
                <Text style={styles.fotoAddIcon}>🖼️</Text>
                <Text style={styles.fotoAddText}>Galería / PC</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.panelLabel, { marginTop: 14 }]}>NOTA (OPCIONAL)</Text>
          <TextInput
            style={[styles.panelInput, styles.panelInputMultiline]}
            value={nota}
            onChangeText={setNota}
            placeholder="Describe la imagen..."
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.panelError}>⚠️ {error}</Text>}
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setPanelAbierto(false)} disabled={guardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirmar} onPress={confirmarNueva} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!panelAbierto && (
        <FlatList
          data={imagenes}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.gridCard}>
              <ImagenViewer uri={item.foto}>
                <Image source={{ uri: item.foto }} style={styles.gridImg} resizeMode="cover" />
              </ImagenViewer>
              {item.nota ? <Text style={styles.gridNota} numberOfLines={3}>{item.nota}</Text> : null}
              <View style={styles.gridMeta}>
                <Text style={styles.gridUsuario} numberOfLines={1}>👤 {item.usuario}</Text>
                <Text style={styles.gridFecha}>{formatFecha(item.creadoEn)}</Text>
              </View>
              {puedeAdministrar && (
                <TouchableOpacity style={styles.gridEliminarBtn} onPress={() => confirmarEliminar(item)}>
                  <Text style={{ fontSize: 14 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyText}>Sin imágenes registradas.</Text>
              {puedeAdministrar && <Text style={styles.emptyHint}>Usa "+ Agregar imagen" para subir la primera.</Text>}
            </View>
          }
          contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 12 }}
        />
      )}
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 10 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  nuevaBtn: { backgroundColor: '#1976D2', margin: 14, marginBottom: 0, borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  panel: { flex: 1, backgroundColor: '#E3F2FD' },
  panelLabel: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  panelInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelInputMultiline: { minHeight: 80 },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600', marginTop: 10 },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelarText: { color: '#555', fontWeight: '700' },
  btnConfirmar: { flex: 2, backgroundColor: '#1976D2', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#e0e0e0' },
  fotoQuitarBtn: { marginTop: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10, alignItems: 'center' },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  fotoBtnsRow: { flexDirection: 'row', gap: 10 },
  fotoAddBtn: { flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 12, paddingVertical: 20, alignItems: 'center', gap: 6, backgroundColor: '#fafafa' },
  fotoAddIcon: { fontSize: 38 },
  fotoAddText: { fontSize: 14, color: '#888', fontWeight: '600' },
  gridCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 8, position: 'relative' },
  gridImg: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#e0e0e0' },
  gridNota: { fontSize: 12, color: '#444', marginTop: 6 },
  gridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  gridUsuario: { fontSize: 10, color: '#888', fontWeight: '600', flex: 1 },
  gridFecha: { fontSize: 10, color: '#bbb' },
  gridEliminarBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 5 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
