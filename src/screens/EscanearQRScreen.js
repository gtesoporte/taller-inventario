import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Modal, Alert, Platform,
} from 'react-native';
import { getPartesPorUbicacion } from '../config/firestore';
import { useAuth } from '../context/AuthContext';

export default function EscanearQRScreen({ navigation, route }) {
  const { perfil } = useAuth();
  const { ubicacionInicial } = route?.params || {};
  const [escaneando, setEscaneando] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const [partes, setPartes] = useState([]);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (ubicacionInicial) {
      procesarQR(ubicacionInicial);
    }
  }, []);

  const iniciarEscaneo = () => {
    if (Platform.OS === 'web') {
      iniciarQRWeb();
    }
    setEscaneando(true);
  };

  const iniciarQRWeb = () => {
    setTimeout(() => {
      try {
        const { Html5Qrcode } = require('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (texto) => {
            scanner.stop().catch(() => {});
            setEscaneando(false);
            procesarQR(texto);
          },
          () => {}
        ).catch(() => {
          Alert.alert('Error', 'No se pudo acceder a la cámara. Verifica los permisos.');
          setEscaneando(false);
        });
      } catch (e) {
        Alert.alert('Error', 'Escáner QR no disponible.');
        setEscaneando(false);
      }
    }, 300);
  };

  const cancelarEscaneo = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setEscaneando(false);
  };

  const procesarQR = async (texto) => {
    setLoading(true);
    setUbicacion(texto);
    const partesUbic = await getPartesPorUbicacion(texto);
    setPartes(partesUbic);
    setLoading(false);
  };

  const limpiar = () => { setUbicacion(null); setPartes([]); };

  // Vista de resultados
  if (ubicacion) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={limpiar}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>📍 {ubicacion}</Text>
          <Text style={styles.sub}>{partes.length} refacciones en esta ubicación</Text>
        </View>

        {loading
          ? <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>
          : (
            <FlatList
              data={partes}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('DetalleParte', { id: item.id })}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNombre}>{item.nombre}</Text>
                    {item.codigo ? <Text style={styles.cardCodigo}>{item.codigo}</Text> : null}
                    {item.fabricante ? <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{item.fabricante.toUpperCase()}</Text></View> : null}
                  </View>
                  <View style={[styles.cantBadge, (item.existencia ?? item.existenciaActual ?? 0) <= 0 && styles.cantRed]}>
                    <Text style={styles.cantNum}>{item.existencia ?? item.existenciaActual ?? 0}</Text>
                    <Text style={styles.cantLabel}>pzas</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.sinPartes}>Sin refacciones registradas en esta ubicación.</Text>
              }
              contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
            />
          )
        }

        {/* Botón agregar refacción a esta ubicación */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('FormParte', { ubicacionPreseleccionada: ubicacion })}
        >
          <Text style={styles.fabText}>+ Agregar refacción aquí</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Vista del escáner
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>✕ Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Escanear QR</Text>
      </View>

      <View style={styles.scanBody}>
        {escaneando ? (
          <>
            <View style={styles.scannerBox}>
              <View nativeID="qr-reader" style={{ width: '100%', minHeight: 300 }} />
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelarEscaneo}>
              <Text style={styles.cancelText}>✕ Cancelar escaneo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Escanea el código QR pegado en la ubicación física para ver las refacciones y registrar movimientos.
              </Text>
            </View>
            <View style={styles.micCircle}>
              <Text style={{ fontSize: 60 }}>📱</Text>
            </View>
            <TouchableOpacity style={styles.scanBtn} onPress={iniciarEscaneo}>
              <Text style={styles.scanBtnText}>📷 Apunta la cámara al código QR</Text>
            </TouchableOpacity>
            <Text style={styles.scanHint}>
              Escanea el código QR pegado en la ubicación física para ver las refacciones y registrar movimientos.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AZUL },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 18, paddingTop: 50 },
  volver: { color: '#60A5FA', fontSize: 15, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scanBody: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  scannerBox: { width: '100%', maxWidth: 380, borderRadius: 16, overflow: 'hidden', marginBottom: 20, backgroundColor: '#000' },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, marginBottom: 30, alignItems: 'flex-start' },
  infoIcon: { fontSize: 22 },
  infoText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  micCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  scanBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginBottom: 16 },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scanHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', maxWidth: 380 },
  cancelText: { color: '#fff', fontWeight: '600' },
  // Results view
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, elevation: 2 },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  cardCodigo: { fontSize: 12, color: '#666', marginTop: 2 },
  fabBadge: { backgroundColor: AZUL, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cantBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48 },
  cantRed: { backgroundColor: '#FFEBEE' },
  cantNum: { fontSize: 18, fontWeight: '800', color: '#2e7d32' },
  cantLabel: { fontSize: 10, color: '#888' },
  sinPartes: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1976D2', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.4, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
