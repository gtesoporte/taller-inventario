import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { suscribirGaleriaSubcategorias, addGaleriaSubcategoria, deleteGaleriaSubcategoria } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

export default function DetalleCategoriaGaleriaScreen({ navigation, route }) {
  const { categoriaId, nombre } = route?.params || {};
  const { perfil } = useAuth();
  const puedeAdministrar = esAdmin(perfil);

  const [subcategorias, setSubcategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [nombreSub, setNombreSub] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!categoriaId) return;
    const unsub = suscribirGaleriaSubcategorias(categoriaId, data => { setSubcategorias(data); setLoading(false); });
    return unsub;
  }, [categoriaId]);

  const abrirNueva = () => { setNombreSub(''); setError(''); setPanelAbierto(true); };

  const confirmarNueva = async () => {
    if (!nombreSub.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      await addGaleriaSubcategoria(categoriaId, nombreSub, perfil);
      setPanelAbierto(false);
    } catch { setError('Error al guardar. Intenta de nuevo.'); }
    setGuardando(false);
  };

  const confirmarEliminar = (sub) => {
    Alert.alert(
      'Eliminar subcategoría',
      `¿Eliminar "${sub.nombre}"? Se eliminarán también sus imágenes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteGaleriaSubcategoria(sub.id).catch(() => {}) },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Galería</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📁 {nombre}</Text>
      </View>

      {puedeAdministrar && !panelAbierto && (
        <TouchableOpacity style={styles.nuevaBtn} onPress={abrirNueva}>
          <Text style={styles.nuevaBtnText}>+ Nueva subcategoría</Text>
        </TouchableOpacity>
      )}

      {panelAbierto && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>NOMBRE DE LA SUBCATEGORÍA *</Text>
          <TextInput
            style={styles.panelInput}
            value={nombreSub}
            onChangeText={v => { setNombreSub(v); setError(''); }}
            placeholder="Ej: BC-780 o Panel frontal"
            placeholderTextColor="#bbb"
            autoFocus
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
        </View>
      )}

      <FlatList
        data={subcategorias}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetalleSubcategoriaGaleria', { subcategoriaId: item.id, nombre: item.nombre })}
          >
            <View style={styles.cardIcon}><Text style={{ fontSize: 26 }}>🖼️</Text></View>
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
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyText}>Sin subcategorías registradas.</Text>
            {puedeAdministrar && <Text style={styles.emptyHint}>Usa "+ Nueva subcategoría" para crear la primera.</Text>}
          </View>
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      />
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
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  eliminarBtn: { padding: 6, marginLeft: 6 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#aaa', fontSize: 13, textAlign: 'center', maxWidth: 280 },
});
