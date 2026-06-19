import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

async function buscarPartes(texto) {
  const snap = await getDocs(collection(db, 'partes'));
  const partes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Divide el texto en palabras individuales y busca cada una
  const palabras = texto.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!palabras.length) return [];

  return partes.filter(p => {
    const campo = [p.nombre, p.codigo, p.fabricante, p.ubicacion, p.descripcion]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return palabras.every(w => campo.includes(w));
  });
}

export default function BusquedaVozScreen({ navigation }) {
  const [estado, setEstado] = useState('idle'); // idle | listening | searching | results | error
  const [resultados, setResultados] = useState([]);
  const [termino, setTermino] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const iniciarEscucha = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMsg('Tu navegador no soporta reconocimiento de voz. Usa Chrome.');
      setEstado('error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'es-MX';
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    setEstado('listening');
    setErrorMsg('');

    rec.start();

    rec.onresult = async (e) => {
      // Toma la alternativa con mayor confianza
      const texto = e.results[0][0].transcript.trim();
      setTermino(texto);
      setEstado('searching');

      try {
        const encontradas = await buscarPartes(texto);
        setResultados(encontradas);
        setEstado('results');
      } catch {
        setErrorMsg('Error al buscar en el inventario. Intenta de nuevo.');
        setEstado('error');
      }
    };

    rec.onerror = (e) => {
      const msg = e.error === 'no-speech'
        ? 'No se detectó voz. Intenta de nuevo.'
        : e.error === 'not-allowed'
          ? 'Permiso de micrófono denegado. Habilítalo en el navegador.'
          : 'Error al reconocer la voz. Intenta de nuevo.';
      setErrorMsg(msg);
      setEstado('error');
    };

    rec.onend = () => {
      // Solo volver a idle si no hubo resultado (onresult no disparó)
      setEstado(prev => prev === 'listening' ? 'idle' : prev);
    };
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

        {/* IDLE */}
        {estado === 'idle' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Di el nombre, código o fabricante de la refacción.{'\n'}
                Ej: "lámpara Mindray" · "MND-3420" · "Ortho"
              </Text>
            </View>
            <TouchableOpacity style={styles.micBtn} onPress={iniciarEscucha}>
              <Text style={styles.micIcon}>🎙️</Text>
              <Text style={styles.micLabel}>Toca para hablar</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ESCUCHANDO */}
        {estado === 'listening' && (
          <View style={styles.centrado}>
            <View style={styles.micBtnActive}>
              <Text style={styles.micIcon}>🎤</Text>
            </View>
            <Text style={styles.listeningText}>Escuchando...</Text>
            <Text style={styles.listeningHint}>Habla ahora</Text>
          </View>
        )}

        {/* BUSCANDO */}
        {estado === 'searching' && (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.listeningText}>Buscando "{termino}"...</Text>
          </View>
        )}

        {/* ERROR */}
        {estado === 'error' && (
          <View style={styles.centrado}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.reiniciar} onPress={() => setEstado('idle')}>
              <Text style={styles.reiniciarText}>🎙️ Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RESULTADOS */}
        {estado === 'results' && (
          <View style={{ flex: 1, alignSelf: 'stretch' }}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>
                "{termino}" — {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.reiniciar} onPress={() => setEstado('idle')}>
                <Text style={styles.reiniciarText}>🎙️ Nueva</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={resultados}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('DetalleParte', { id: item.id })}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardNombre}>{item.nombre}</Text>
                    <View style={[
                      styles.cantBadge,
                      (item.existencia ?? item.existenciaActual ?? 0) <= 0 && styles.cantBadgeRed,
                    ]}>
                      <Text style={styles.cantNum}>{item.existencia ?? item.existenciaActual ?? 0}</Text>
                      <Text style={styles.cantLabel}>pz</Text>
                    </View>
                  </View>
                  {item.codigo ? <Text style={styles.cardCod}>{item.codigo}</Text> : null}
                  <View style={styles.cardMeta}>
                    {item.fabricante ? <Text style={styles.cardMetaItem}>🏭 {item.fabricante}</Text> : null}
                    {item.ubicacion ? <Text style={styles.cardMetaItem}>📍 {item.ubicacion}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.centrado}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyText}>Sin resultados para "{termino}"</Text>
                  <Text style={styles.emptyHint}>
                    Intenta con palabras más cortas o el código exacto.
                  </Text>
                  <TouchableOpacity style={[styles.reiniciar, { marginTop: 20 }]} onPress={() => setEstado('idle')}>
                    <Text style={styles.reiniciarText}>🎙️ Intentar de nuevo</Text>
                  </TouchableOpacity>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
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
  micBtnActive: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  micIcon: { fontSize: 52 },
  micLabel: { color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 6 },
  centrado: { alignItems: 'center', gap: 12 },
  listeningText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  listeningHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  errorIcon: { fontSize: 40 },
  errorText: { color: '#FCA5A5', fontSize: 14, fontWeight: '600', textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  cardCod: { fontSize: 12, color: '#666', marginTop: 3 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  cardMetaItem: { fontSize: 12, color: '#888' },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 42 },
  cantBadgeRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 16, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 9, color: '#888' },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', maxWidth: 260 },
  reiniciar: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  reiniciarText: { color: '#fff', fontWeight: '700' },
});
