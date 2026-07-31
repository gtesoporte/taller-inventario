import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Text from '../components/UpperText';
import { useAuth } from '../context/AuthContext';
import DrawerMenu from '../components/DrawerMenu';

export default function ConfigScreen({ navigation }) {
  const { user, perfil, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const handleLogout = async () => {
    setSaliendo(true);
    try {
      await logout();
    } catch {
      setSaliendo(false);
      setConfirmando(false);
    }
  };

  const rolLower = (perfil?.rol || '').toLowerCase();
  const esAdmin = rolLower.includes('admin') || rolLower.includes('super');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuAbierto(true)}>
            <Text style={styles.menuBtnIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚙️ Configuración</Text>
        </View>
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
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Rol</Text>
          <Text style={styles.infoVal}>{perfil?.rol || '—'}</Text>
        </View>
      </View>

      {esAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administración</Text>
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Fabricantes')}>
            <Text style={styles.menuIcon}>🏭</Text>
            <Text style={styles.menuLabel}>Fabricantes</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {confirmando ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>¿Cerrar sesión?</Text>
          <Text style={styles.confirmSub}>Tendrás que volver a iniciar sesión para acceder.</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmando(false)} disabled={saliendo}>
              <Text style={styles.confirmCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmSalirBtn} onPress={handleLogout} disabled={saliendo}>
              {saliendo
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmSalirText}>Salir</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setConfirmando(true)}>
          <Text style={styles.logoutText}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>
      )}

      <DrawerMenu visible={menuAbierto} onClose={() => setMenuAbierto(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: '#0B2447', padding: 18, paddingTop: 50 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  menuBtnIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  section: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  infoVal: { fontSize: 14, color: '#1a1a2e' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0 },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  menuArrow: { fontSize: 22, color: '#bbb' },
  logoutBtn: { margin: 16, marginTop: 12, backgroundColor: '#FFEBEE', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
  logoutText: { color: '#C62828', fontWeight: '700', fontSize: 15 },
  confirmBox: { margin: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#FFCDD2', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#C62828', marginBottom: 4 },
  confirmSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  confirmCancelText: { color: '#555', fontWeight: '700', fontSize: 14 },
  confirmSalirBtn: { flex: 1, backgroundColor: '#C62828', borderRadius: 10, padding: 13, alignItems: 'center' },
  confirmSalirText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
