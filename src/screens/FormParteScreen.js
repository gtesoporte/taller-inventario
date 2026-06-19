import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { addParte, getFabricantes } from '../config/firestore';

export default function FormParteScreen({ navigation, route }) {
  const ubicPre = route?.params?.ubicacionPreseleccionada || '';

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [ubicacion, setUbicacion] = useState(ubicPre);
  const [existencia, setExistencia] = useState('0');
  const [fabricantes, setFabricantes] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getFabricantes().then(setFabricantes);
  }, []);

  const handleGuardar = async () => {
    if (!nombre.trim()) { Alert.alert('Falta el nombre', 'El nombre de la refacción es obligatorio.'); return; }
    setGuardando(true);
    try {
      await addParte({
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        fabricante: fabricante || null,
        ubicacion: ubicacion.trim() || null,
        existencia: parseInt(existencia, 10) || 0,
      });
      Alert.alert('Guardado', 'Refacción registrada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la refacción.');
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
        <Text style={styles.titulo}>Nueva refacción</Text>
        {ubicPre ? <Text style={styles.sub}>📍 {ubicPre}</Text> : null}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }}>
        <Campo label="NOMBRE *" placeholder="Ej: Lámpara de repuesto">
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Lámpara de repuesto" placeholderTextColor="#bbb" />
        </Campo>
        <Campo label="CÓDIGO / PARTE N°" placeholder="">
          <TextInput style={styles.input} value={codigo} onChangeText={setCodigo} placeholder="Ej: MND-3420A" placeholderTextColor="#bbb" />
        </Campo>
        <Campo label="FABRICANTE" placeholder="">
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
        </Campo>
        <Campo label="UBICACIÓN">
          <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Ej: Estante A1" placeholderTextColor="#bbb" />
        </Campo>
        <Campo label="EXISTENCIA INICIAL">
          <TextInput style={styles.input} value={existencia} onChangeText={setExistencia} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
        </Campo>

        <TouchableOpacity style={styles.btn} onPress={handleGuardar} disabled={guardando}>
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Guardar refacción</Text>
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: AZUL, borderColor: AZUL },
  chipText: { fontSize: 12, fontWeight: '700', color: '#555' },
  chipTextActive: { color: '#fff' },
  btn: { backgroundColor: '#1976D2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
