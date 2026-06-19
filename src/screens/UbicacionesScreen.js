import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { getUbicaciones, addUbicacion } from '../config/firestore';

export default function UbicacionesScreen({ navigation }) {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [nueva, setNueva] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => getUbicaciones().then(data => { setUbicaciones(data); setLoading(false); });

  useEffect(() => { cargar(); }, []);

  const imprimirQR = async (nombre) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Solo web', 'La impresión de QR está disponible en la versión web.');
      return;
    }
    try {
      const QRCode = require('qrcode');
      const dataUrl = await QRCode.toDataURL(nombre, {
        width: 300,
        margin: 2,
        color: { dark: '#0B2447', light: '#FFFFFF' },
      });
      const win = window.open('', '_blank', 'width=420,height=560');
      if (!win) {
        Alert.alert('Ventanas bloqueadas', 'Permite ventanas emergentes en tu navegador para imprimir el QR.');
        return;
      }
      win.document.write(`<!DOCTYPE html><html><head><title>QR - ${nombre}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;text-align:center;padding:40px 20px;background:#fff}
        .card{display:inline-block;border:2px solid #0B2447;border-radius:12px;padding:20px 30px}
        img{width:220px;height:220px;display:block;margin:0 auto}
        h2{margin-top:16px;font-size:18px;color:#0B2447;font-weight:bold;word-break:break-word}
        p{color:#888;font-size:11px;margin-top:8px}
        @media print{body{padding:10px}}
      </style></head><body>
      <div class="card">
        <img src="${dataUrl}" alt="QR ${nombre}" />
        <h2>${nombre}</h2>
        <p>Taller Inventario · Diagnóstica Internacional</p>
      </div>
      <script>setTimeout(function(){window.print();},400);<\/script>
      </body></html>`);
      win.document.close();
    } catch {
      Alert.alert('Error', 'No se pudo generar el código QR.');
    }
  };

  const handleAgregar = async () => {
    if (!nueva.trim()) return;
    setGuardando(true);
    await addUbicacion(nueva.trim());
    setNueva('');
    await cargar();
    setGuardando(false);
  };

  const filtradas = ubicaciones.filter(u =>
    !filtro || u.nombre?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📍 Ubicaciones</Text>
        <Text style={styles.sub}>{ubicaciones.length} registradas</Text>
      </View>

      <View style={styles.body}>
        {/* Nueva ubicación */}
        <View style={styles.nuevaBox}>
          <Text style={styles.nuevaLabel}>NUEVA UBICACIÓN</Text>
          <View style={styles.nuevaRow}>
            <TextInput
              style={styles.nuevaInput}
              placeholder="Ej: Rack A · Cajón 3 · Estante B"
              value={nueva}
              onChangeText={setNueva}
            />
            <TouchableOpacity style={styles.agregarBtn} onPress={handleAgregar} disabled={guardando}>
              <Text style={styles.agregarText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Buscador */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="🔍  Buscar ubicación..."
            value={filtro}
            onChangeText={setFiltro}
          />
          <TouchableOpacity style={styles.todosBtn}>
            <Text style={styles.todosBtnText}>Todos</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtradas}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardCheck} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardNombre}>{item.nombre}</Text>
                <Text style={styles.cardSub}>{item.refacciones ?? 0} refacciones · {item.piezas ?? 0} pzas</Text>
              </View>
              <View style={styles.cardBtns}>
                <TouchableOpacity style={styles.btnPrint} onPress={() => imprimirQR(item.nombre)}>
                  <Text style={{ fontSize: 18 }}>🖨️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDelete}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay ubicaciones registradas.</Text>}
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
  nuevaBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  nuevaLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 0.5, marginBottom: 10 },
  nuevaRow: { flexDirection: 'row', gap: 10 },
  nuevaInput: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 12, fontSize: 13, borderWidth: 1, borderColor: '#e0e0e0' },
  agregarBtn: { backgroundColor: AZUL, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  agregarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  todosBtn: { backgroundColor: AZUL, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  todosBtnText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1, gap: 10 },
  cardCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#ccc' },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardBtns: { gap: 6 },
  btnPrint: { backgroundColor: '#1976D2', borderRadius: 10, padding: 8, alignItems: 'center' },
  btnDelete: { borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#F44336' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
});
