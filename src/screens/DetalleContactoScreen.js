import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import Text from '../components/UpperText';
import { getContacto, deleteContacto } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value}</Text>
    </View>
  );
}

export default function DetalleContactoScreen({ route, navigation }) {
  const id = route?.params?.id;
  const { perfil } = useAuth();
  const puedeEditar = esAdmin(perfil);

  const [contacto, setContacto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getContacto(id).then(c => { setContacto(c); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await deleteContacto(id);
      navigation.goBack();
    } catch {
      setEliminando(false);
      setConfirmEliminar(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  if (!contacto) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#999', marginBottom: 16 }}>Contacto no encontrado.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: '#1565C0' }}>← Volver</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Contactos</Text>
          </TouchableOpacity>
          {puedeEditar && (
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.editarBtn} onPress={() => navigation.navigate('FormContacto', { id, contacto })}>
                <Text style={styles.editarText}>✏️ Editar</Text>
              </TouchableOpacity>
              {confirmEliminar ? (
                <View style={styles.eliminarConfirm}>
                  <TouchableOpacity style={styles.eliminarSiBtn} onPress={handleEliminar} disabled={eliminando}>
                    {eliminando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.eliminarSiText}>Eliminar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmEliminar(false)}>
                    <Text style={styles.eliminarNoText}>No</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.eliminarBtn} onPress={() => setConfirmEliminar(true)}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <Text style={styles.nombre}>{contacto.nombre}</Text>
        {contacto.activoFracttal ? <Text style={styles.subinfo}>🏢 {contacto.activoFracttal}</Text> : null}
      </View>

      <View style={styles.accionesRow}>
        {contacto.telefono ? (
          <TouchableOpacity style={styles.accionBtn} onPress={() => Linking.openURL(`tel:${contacto.telefono.replace(/\s+/g, '')}`)}>
            <Text style={styles.accionIcon}>📞</Text>
            <Text style={styles.accionText}>Llamar</Text>
          </TouchableOpacity>
        ) : null}
        {contacto.email ? (
          <TouchableOpacity style={styles.accionBtn} onPress={() => Linking.openURL(`mailto:${contacto.email}`)}>
            <Text style={styles.accionIcon}>✉️</Text>
            <Text style={styles.accionText}>Correo</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.seccion}>ℹ️ INFORMACIÓN</Text>
        <View style={styles.infoBox}>
          <InfoRow label="Código" value={contacto.codigo} />
          <InfoRow label="Ciudad" value={contacto.ciudad} />
          <InfoRow label="Contacto" value={contacto.contacto} />
          <InfoRow label="Teléfono" value={contacto.telefono} />
          <InfoRow label="Email" value={contacto.email} />
          <InfoRow label="Activo Fracttal" value={contacto.activoFracttal} />
        </View>
      </ScrollView>
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  volver: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editarBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editarText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  eliminarBtn: { padding: 6 },
  eliminarConfirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  eliminarSiBtn: { backgroundColor: '#C62828', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  eliminarSiText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  eliminarNoText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  nombre: { fontSize: 20, fontWeight: '900', color: '#fff' },
  subinfo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  accionesRow: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 0 },
  accionBtn: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  accionIcon: { fontSize: 16 },
  accionText: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  seccion: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  infoBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  infoLabel: { fontSize: 14, color: '#666', flex: 1 },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', maxWidth: '55%', textAlign: 'right' },
});
