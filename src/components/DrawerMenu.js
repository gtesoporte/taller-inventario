import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from './UpperText';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

const SECCIONES = [
  { tab: 'Inventario', icon: '📦', label: 'Inventario' },
  { tab: 'Proyectos', icon: '🔧', label: 'Proyectos' },
  { tab: 'Movimientos', icon: '📋', label: 'Movimientos' },
  { tab: 'Cajuelas', icon: '🧰', label: 'Cajuelas' },
  { tab: 'Galería', icon: '🖼️', label: 'Galería' },
  { tab: 'Config', icon: '⚙️', label: 'Configuración' },
  { tab: 'Admin', icon: '👑', label: 'Administración' },
];

export default function DrawerMenu({ visible, onClose }) {
  const navigation = useNavigation();
  const { perfil, logout } = useAuth();

  const ir = (tab) => {
    onClose();
    navigation.navigate(tab);
  };

  const salir = async () => {
    onClose();
    try { await logout(); } catch {}
  };

  const letra = (perfil?.nombre || perfil?.email || '?').charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.perfilBox}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{letra}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>{perfil?.nombre || perfil?.email || 'Usuario'}</Text>
              {perfil?.rol ? <Text style={styles.rol}>{perfil.rol}</Text> : null}
            </View>
          </View>

          <View style={styles.divider} />

          <ScrollView style={styles.lista} contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator={false}>
            {SECCIONES.map(s => (
              <TouchableOpacity key={s.tab} style={styles.item} onPress={() => ir(s.tab)}>
                <Text style={styles.itemIcon}>{s.icon}</Text>
                <Text style={styles.itemLabel}>{s.label}</Text>
                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.salirBtn} onPress={salir}>
            <Text style={styles.salirIcon}>🚪</Text>
            <Text style={styles.salirText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    width: 280, maxWidth: '82%', height: '100%',
    backgroundColor: '#fff', paddingTop: 54, paddingHorizontal: 0,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  perfilBox: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 18 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
  nombre: { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  rol: { fontSize: 12, color: '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#eee' },
  lista: { flex: 1 },
  listaContent: { paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  itemIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  itemArrow: { fontSize: 18, color: '#ccc' },
  salirBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  salirIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  salirText: { fontSize: 14, fontWeight: '700', color: '#C62828' },
});
