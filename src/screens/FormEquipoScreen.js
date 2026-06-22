import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { addEquipo, updateEquipo, suscribirFabricantes, getUbicaciones } from '../config/firestore';
import { seleccionarFoto } from '../utils/fotoHelper';

export default function FormEquipoScreen({ navigation, route }) {
  const { id, equipo } = route?.params || {};
  const esEdicion = !!id && !!equipo;

  const [modelo, setModelo] = useState(equipo?.modelo || '');
  const [fabricante, setFabricante] = useState(equipo?.fabricante || '');
  const [numeroSerie, setNumeroSerie] = useState(equipo?.numeroSerie || '');
  const [ubicacion, setUbicacion] = useState(equipo?.ubicacion || '');
  const [observaciones, setObservaciones] = useState(equipo?.observaciones || '');
  const [foto, setFoto] = useState(equipo?.foto || '');
  const [fabricantes, setFabricantes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const unsub = suscribirFabricantes(setFabricantes);
    getUbicaciones().then(setUbicaciones).catch(() => {});
    return unsub;
  }, []);

  const handleGuardar = async () => {
    setError('');
    if (!modelo.trim()) {
      setError('El modelo del equipo es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        modelo: modelo.trim(),
        fabricante: fabricante || null,
        numeroSerie: numeroSerie.trim() || null,
        ubicacion: ubicacion.trim() || null,
        observaciones: observaciones.trim() || null,
        foto: foto || null,
      };
      if (esEdicion) {
        await updateEquipo(id, data);
      } else {
        await addEquipo(data);
      }
      setGuardado(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch {
      setError('No se pudo guardar el equipo. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{esEdicion ? 'Editar equipo' : 'Nuevo equipo'}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        <Campo label="MODELO *">
          <TextInput
            style={styles.input}
            value={modelo}
            onChangeText={v => { setModelo(v); setError(''); }}
            placeholder="Ej: BC-5150"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="FABRICANTE">
          <View style={styles.chipsWrap}>
            {fabricantes.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, fabricante === f && styles.chipActive]}
                onPress={() => setFabricante(prev => prev === f ? '' : f)}
              >
                <Text style={[styles.chipText, fabricante === f && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {fabricante && !fabricantes.includes(fabricante) && (
            <Text style={styles.customHint}>Fabricante: {fabricante}</Text>
          )}
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={fabricante}
            onChangeText={setFabricante}
            placeholder="O escribe un fabricante nuevo..."
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="NÚMERO DE SERIE">
          <TextInput
            style={styles.input}
            value={numeroSerie}
            onChangeText={setNumeroSerie}
            placeholder="Ej: SN20240312-001"
            placeholderTextColor="#bbb"
            autoCapitalize="characters"
          />
        </Campo>

        <Campo label="UBICACIÓN">
          {ubicaciones.length > 0 && (
            <View style={styles.chipsWrap}>
              {ubicaciones.map(u => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.chip, ubicacion === u.nombre && styles.chipActive]}
                  onPress={() => setUbicacion(prev => prev === u.nombre ? '' : u.nombre)}
                >
                  <Text style={[styles.chipText, ubicacion === u.nombre && styles.chipTextActive]}>
                    📍 {u.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={ubicacion}
            onChangeText={setUbicacion}
            placeholder={ubicaciones.length > 0 ? 'O escribe una nueva ubicación...' : 'Ej: Rack A · Cajón 3'}
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="FOTOGRAFÍA">
          {foto ? (
            <View>
              <Image source={{ uri: foto }} style={styles.fotoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitarBtn} onPress={() => setFoto('')}>
                <Text style={styles.fotoQuitarText}>🗑️ Quitar foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fotoAddBtn} onPress={() => seleccionarFoto(setFoto)}>
              <Text style={styles.fotoAddIcon}>📷</Text>
              <Text style={styles.fotoAddText}>Tomar foto o elegir imagen</Text>
            </TouchableOpacity>
          )}
        </Campo>

        <Campo label="OBSERVACIONES">
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Notas adicionales sobre este equipo..."
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Campo>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {guardado && (
          <View style={styles.exitoBox}>
            <Text style={styles.exitoText}>✅ {esEdicion ? 'Equipo actualizado.' : 'Equipo registrado.'}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, guardado && styles.btnExito]}
          onPress={handleGuardar}
          disabled={guardando || guardado}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{esEdicion ? 'Guardar cambios' : 'Guardar equipo'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Campo({ label, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  body: { flex: 1, padding: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', color: '#1a1a2e' },
  inputMultiline: { minHeight: 90, paddingTop: 12 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#e0e0e0' },
  fotoAddBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, backgroundColor: '#fafafa' },
  fotoAddIcon: { fontSize: 38 },
  fotoAddText: { fontSize: 14, color: '#888', fontWeight: '600' },
  fotoQuitarBtn: { marginTop: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10, alignItems: 'center' },
  fotoQuitarText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: AZUL, borderColor: AZUL },
  chipText: { fontSize: 12, fontWeight: '700', color: '#555' },
  chipTextActive: { color: '#fff' },
  customHint: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  exitoBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#A5D6A7' },
  exitoText: { color: '#2E7D32', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#1565C0', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  btnExito: { backgroundColor: '#2E7D32' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
