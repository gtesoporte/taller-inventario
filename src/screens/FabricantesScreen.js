import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { getFabricantes, addFabricante } from '../config/firestore';

export default function FabricantesScreen({ navigation }) {
  const [fabricantes, setFabricantes] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => getFabricantes().then(lista => { setFabricantes(lista); setLoading(false); });

  useEffect(() => { cargar(); }, []);

  const handleAgregar = async () => {
    const nombre = nuevo.trim().toUpperCase();
    if (!nombre) return;
    if (fabricantes.includes(nombre)) {
      Alert.alert('Ya existe', `"${nombre}" ya está en la lista.`);
      return;
    }
    setGuardando(true);
    const lista = await addFabricante(nombre);
    setFabricantes(lista);
    setNuevo('');
    setGuardando(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>🏭 Fabricantes</Text>
        <Text style={styles.sub}>{fabricantes.length} registrados</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.nuevaBox}>
          <Text style={styles.nuevaLabel}>NUEVO FABRICANTE</Text>
          <View style={styles.nuevaRow}>
            <TextInput
              style={styles.input}
              placeholder="Ej: ABBOTT, ROCHE, SYSMEX..."
              value={nuevo}
              onChangeText={t => setNuevo(t.toUpperCase())}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.agregarBtn} onPress={handleAgregar} disabled={guardando}>
              <Text style={styles.agregarText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={fabricantes}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardNombre}>{item}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Fabricante</Text></View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay fabricantes registrados.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  body: { flex: 1, padding: 14 },
  nuevaBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  nuevaLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 0.5, marginBottom: 10 },
  nuevaRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  agregarBtn: { backgroundColor: AZUL, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  agregarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  badge: { backgroundColor: '#EEF2F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, color: '#666', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
});
