import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getPartes } from '../config/firestore';

export default function BusquedaVozScreen({ navigation }) {
  const [estado, setEstado] = useState('idle'); // idle | listening | results
  const [resultados, setResultados] = useState([]);
  const [termino, setTermino] = useState('');

  const iniciarEscucha = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome en escritorio o Android.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'es-MX';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setEstado('listening');
    rec.start();
    rec.onresult = async (e) => {
      const texto = e.results[0][0].transcript;
      setTermino(texto);
      setEstado('searching');
      const partes = await getPartes();
      const q = texto.toLowerCase();
      const encontradas = partes.filter(p =>
        p.nombre?.toLowerCase().includes(q) ||
        p.codigo?.toLowerCase().includes(q) ||
        p.fabricante?.toLowerCase().includes(q)
      );
      setResultados(encontradas);
      setEstado('results');
    };
    rec.onerror = () => setEstado('idle');
    rec.onend = () => { if (estado === 'listening') setEstado('idle'); };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>🎙️ Búsqueda por voz</Text>
      </View>

      <View style={styles.body}>
        {estado === 'idle' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Di el nombre o código de la refacción que buscas.{'\n'}Ej: "lámpara Mindray" o "MND-3420"
              </Text>
            </View>
            <TouchableOpacity style={styles.micBtn} onPress={iniciarEscucha}>
              <Text style={styles.micIcon}>🎙️</Text>
              <Text style={styles.micLabel}>Toca para hablar</Text>
            </TouchableOpacity>
          </>
        )}

        {estado === 'listening' && (
          <View style={styles.listeningBox}>
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={styles.listeningText}>Escuchando...</Text>
          </View>
        )}

        {estado === 'searching' && (
          <View style={styles.listeningBox}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.listeningText}>Buscando "{termino}"...</Text>
          </View>
        )}

        {estado === 'results' && (
          <>
            <Text style={styles.resultLabel}>"{termino}" — {resultados.length} resultado(s)</Text>
            <FlatList
              data={resultados}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DetalleParte', { id: item.id })}>
                  <Text style={styles.cardNombre}>{item.nombre}</Text>
                  {item.codigo ? <Text style={styles.cardCod}>{item.codigo}</Text> : null}
                  <Text style={styles.cardFab}>{item.fabricante || ''} · {item.ubicacion || 'Sin ubicación'}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No se encontró ninguna coincidencia.</Text>}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
            <TouchableOpacity style={styles.reiniciar} onPress={() => setEstado('idle')}>
              <Text style={styles.reiniciarText}>🎙️ Nueva búsqueda</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AZUL },
  header: { padding: 18, paddingTop: 50 },
  volver: { color: '#60A5FA', fontSize: 15, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  body: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 30, alignSelf: 'stretch' },
  infoText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  micBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.5, elevation: 8 },
  micIcon: { fontSize: 52 },
  micLabel: { color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 6 },
  listeningBox: { alignItems: 'center', gap: 16 },
  listeningText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  resultLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12, alignSelf: 'flex-start' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, alignSelf: 'stretch', width: '100%' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardCod: { fontSize: 12, color: '#666', marginTop: 2 },
  cardFab: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 30 },
  reiniciar: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  reiniciarText: { color: '#fff', fontWeight: '700' },
});
