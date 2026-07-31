import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirGaleriaCategorias, addGaleriaCategoria, updateGaleriaCategoria, deleteGaleriaCategoria } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';
import { seleccionarFoto } from '../utils/fotoHelper';
import { mostrarAlerta } from '../utils/confirmar';
import DrawerMenu from '../components/DrawerMenu';

export default function GaleriaScreen({ navigation }) {
  const { perfil } = useAuth();
  const puedeAdministrar = esAdmin(perfil);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [foto, setFoto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [cambiandoFotoId, setCambiandoFotoId] = useState(null);

  useEffect(() => {
    const unsub = suscribirGaleriaCategorias(data => { setCategorias(data); setLoading(false); });
    return unsub;
  }, []);

  const abrirNueva = () => { setNombre(''); setFoto(''); setError(''); setPanelAbierto(true); };

  const confirmarNueva = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      await addGaleriaCategoria(nombre, perfil, foto);
      setPanelAbierto(false);
    } catch { setError('Error al guardar. Intenta de nuevo.'); }
    setGuardando(false);
  };

  const confirmarEliminar = (categoria) => {
    mostrarAlerta(
      'ELIMINAR CATEGORÍA',
      `¿ELIMINAR "${categoria.nombre.toUpperCase()}"? SE ELIMINARÁN TAMBIÉN SUS SUBCATEGORÍAS E IMÁGENES.`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'ELIMINAR', style: 'destructive', onPress: () => deleteGaleriaCategoria(categoria.id).catch(() => {}) },
      ]
    );
  };

  const cambiarIcono = (categoria) => {
    seleccionarFoto(async (b64) => {
      setCambiandoFotoId(categoria.id);
      try { await updateGaleriaCategoria(categoria.id, { foto: b64 }); } catch {}
      setCambiandoFotoId(null);
    }, 'galeria');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tituloRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuAbierto(true)}>
            <Text style={styles.menuBtnIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>🖼️ Galería</Text>
        </View>
        <Text style={styles.sub}>Fotos de equipos y refacciones por categoría</Text>
      </View>

      {puedeAdministrar && !panelAbierto && (
        <TouchableOpacity style={styles.nuevaBtn} onPress={abrirNueva}>
          <Text style={styles.nuevaBtnText}>+ Nueva categoría</Text>
        </TouchableOpacity>
      )}

      {panelAbierto && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>NOMBRE DE LA CATEGORÍA *</Text>
          <TextInput
            style={styles.panelInput}
            value={nombre}
            onChangeText={v => { setNombre(v); setError(''); }}
            placeholder="Ej: MINDRAY"
            placeholderTextColor="#bbb"
            autoFocus
          />

          <Text style={[styles.panelLabel, { marginTop: 14 }]}>ÍCONO (OPCIONAL)</Text>
          {foto ? (
            <View style={styles.iconoPreviewRow}>
              <Image source={{ uri: foto }} style={styles.iconoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setFoto('')}>
                <Text style={styles.fotoQuitarText}>🗑️ Quitar</Text>
              </TouchableOpacity>
            </View>
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

          {!!error && <Text style={styles.panelError}>⚠️ {error}</Text>}
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setPanelAbierto(false)} disabled={guardando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirmar} onPress={confirmarNueva} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmarText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={categorias}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetalleCategoriaGaleria', { categoriaId: item.id, nombre: item.nombre })}
          >
            <TouchableOpacity
              style={styles.cardIcon}
              onPress={puedeAdministrar ? () => cambiarIcono(item) : undefined}
              disabled={!puedeAdministrar}
            >
              {cambiandoFotoId === item.id ? (
                <ActivityIndicator size="small" color="#1565C0" />
              ) : item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.cardIconImg} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 26 }}>📁</Text>
              )}
              {puedeAdministrar && (
                <View style={styles.cardIconCam}><Text style={{ fontSize: 10 }}>📷</Text></View>
              )}
            </TouchableOpacity>
            <View style={styles.cardBody}>
              <Text style={styles.cardNombre}>{item.nombre}</Text>
            </View>
            {puedeAdministrar && (
              <TouchableOpacity style={styles.eliminarBtn} onPress={() => confirmarEliminar(item)}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyText}>Sin categorías registradas.</Text>
            {puedeAdministrar && <Text style={styles.emptyHint}>Usa "+ Nueva categoría" para crear la primera.</Text>}
          </View>
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      />

      <DrawerMenu visible={menuAbierto} onClose={() => setMenuAbierto(false)} />
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  tituloRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  menuBtnIcon: { fontSize: 22, color: '#fff' },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  nuevaBtn: { backgroundColor: '#1976D2', margin: 14, marginBottom: 0, borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  panel: { backgroundColor: '#fff', margin: 14, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ddd' },
  panelLabel: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  panelInput: { backgroundColor: '#fafafa', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#1a1a2e' },
  panelError: { color: '#C62828', fontSize: 13, fontWeight: '600', marginTop: 8 },
  panelBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnCancelar: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnCancelarText: { color: '#555', fontWeight: '700' },
  btnConfirmar: { flex: 2, backgroundColor: '#1976D2', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, elevation: 2 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center', marginRight: 14, position: 'relative', overflow: 'visible' },
  cardIconImg: { width: 48, height: 48, borderRadius: 12 },
  cardIconCam: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 8, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 3 },
  iconoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoPreview: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#e0e0e0' },
  fotoQuitarBtn: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 12 },
  fotoBtnsRow: { flexDirection: 'row', gap: 8 },
  fotoAddBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  fotoAddIcon: { fontSize: 24 },
  fotoAddText: { fontSize: 11, color: '#888', fontWeight: '600' },
  cardBody: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  eliminarBtn: { padding: 6, marginLeft: 6 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
