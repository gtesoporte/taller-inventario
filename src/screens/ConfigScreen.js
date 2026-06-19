import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ConfigScreen() {
  const { user, perfil, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Configuración</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi cuenta</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre</Text>
          <Text style={styles.infoVal}>{perfil?.nombre || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoVal}>{user?.email || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rol</Text>
          <Text style={styles.infoVal}>{perfil?.rol || '—'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: '#0B2447', padding: 18, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  infoVal: { fontSize: 14, color: '#1a1a2e' },
  logoutBtn: { margin: 16, backgroundColor: '#FFEBEE', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
  logoutText: { color: '#C62828', fontWeight: '700', fontSize: 15 },
});
