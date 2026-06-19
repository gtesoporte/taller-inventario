import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { addParte, updateParte, getFabricantes, getUbicaciones } from '../config/firestore';

export default function FormParteScreen({ navigation, route }) {
  const { id, parte, ubicacionPreseleccionada } = route?.params || {};
  const esEdicion = !!id && !!parte;

  const [nombre, setNombre] = useState(parte?.nombre || '');
  const [codigo, setCodigo] = useState(parte?.codigo || '');
  const [fabricante, setFabricante] = useState(parte?.fabricante || '');
  const [ubicacion, setUbicacion] = useState(parte?.ubicacion || ubicacionPreseleccionada || '');
  const [existencia, setExistencia] = useState(String(parte?.existencia ?? parte?.existenciaActual ?? 0));
  const [observaciones, setObservaciones] = useState(parte?.observaciones || '');
  const [fabricantes, setFabricantes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    getFabricantes().then(setFabricantes).catch(() => {});
    getUbicaciones().then(setUbicaciones).catch(() => {});
  }, []);

  const handleGuardar = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('El nombre de la refacción es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        fabricante: fabricante || null,
        ubicacion: ubicacion.trim() || null,
        existencia: parseInt(existencia, 10) || 0,
        observaciones: observaciones.trim() || null,
      };
      if (esEdicion) {
        await updateParte(id, data);
      } else {
        await addParte(data);
      }
      setGuardado(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch {
      setError('No se pudo guardar la refacción. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const ubicacionesNombres = ubicaciones.map(u => u.nombre).filter(Boolean);
  const chipUbicActivo = ubicacionesNombres.includes(ubicacion);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{esEdicion ? 'Editar refacción' : 'Nueva refacción'}</Text>
        {ubicacionPreseleccionada && !esEdicion
          ? <Text style={styles.sub}>📍 {ubicacionPreseleccionada}</Text>
          : null}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        <Campo label="NOMBRE *">
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={v => { setNombre(v); setError(''); }}
            placeholder="Ej: Lámpara de repuesto"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="CÓDIGO / PARTE N°">
          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="Ej: MND-3420A"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="FABRICANTE">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
          </ScrollView>
          {fabricante && !fabricantes.includes(fabricante) && (
            <Text style={styles.customHint}>Fabricante: {fabricante}</Text>
          )}
        </Campo>

        <Campo label="UBICACIÓN">
          {ubicacionesNombres.length > 0 && (
            <View style={styles.chipsWrap}>
              {ubicacionesNombres.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, ubicacion === u && styles.chipActive]}
                  onPress={() => setUbicacion(prev => prev === u ? '' : u)}
                >
                  <Text style={[styles.chipText, ubicacion === u && styles.chipTextActive]}>📍 {u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={ubicacion}
            onChangeText={setUbicacion}
            placeholder={ubicacionesNombres.length > 0 ? 'O escribe una nueva ubicación...' : 'Ej: Estante A1'}
            placeholderTextColor="#bbb"
          />
          {chipUbicActivo && (
            <Text style={styles.customHint}>📍 Ubicación seleccionada: {ubicacion}</Text>
          )}
        </Campo>

        <Campo label={esEdicion ? 'EXISTENCIA' : 'EXISTENCIA INICIAL'}>
          <TextInput
            style={styles.input}
            value={existencia}
            onChangeText={setExistencia}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="OBSERVACIONES">
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Notas adicionales sobre esta refacción..."
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
            <Text style={styles.exitoText}>✅ {esEdicion ? 'Refacción actualizada.' : 'Refacción registrada.'}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.btn, guardado && styles.btnExito]} onPress={handleGuardar} disabled={guardando || guardado}>
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{esEdicion ? 'Guardar cambios' : 'Guardar refacción'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Campo({ label, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
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
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  body: { flex: 1, padding: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', color: '#1a1a2e' },
  inputMultiline: { minHeight: 90, paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: AZUL, borderColor: AZUL },
  chipText: { fontSize: 12, fontWeight: '700', color: '#555' },
  chipTextActive: { color: '#fff' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  customHint: { fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  exitoBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#A5D6A7' },
  exitoText: { color: '#2E7D32', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#1976D2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  btnExito: { backgroundColor: '#2E7D32' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
