import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Text from '../components/UpperText';
import { getUsuarios, updateUsuario } from '../config/firestore';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Todos', 'Superadministrador', 'Administrador', 'Técnico'];
const ROL_COLORES = {
  Superadministrador: { bg: '#F3E8FF', text: '#6D28D9', emoji: '👑' },
  Administrador:      { bg: '#FEF3C7', text: '#92400E', emoji: '🔑' },
  Técnico:            { bg: '#D1FAE5', text: '#065F46', emoji: '🔧' },
};

function Avatar({ nombre, color }) {
  const letra = nombre?.charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarLetra}>{letra}</Text>
    </View>
  );
}

const COLORES_AVATAR = ['#6D28D9', '#1565C0', '#0B5345', '#7B241C', '#1A5276', '#6E2FD4', '#117A65'];

export default function AdminScreen() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [rolFiltro, setRolFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsuarios().then(data => { setUsuarios(data); setLoading(false); });
  }, []);

  const filtrados = rolFiltro === 'Todos' ? usuarios : usuarios.filter(u => u.rol === rolFiltro);

  function formatFecha(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6D28D9" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👑 Administración</Text>
        <Text style={styles.headerSub}>{usuarios.length} usuarios registrados</Text>
      </View>

      <View style={styles.filtrosRow}>
        {ROLES.map(rol => {
          const cfg = ROL_COLORES[rol];
          return (
            <TouchableOpacity
              key={rol}
              style={[styles.filtroBtn, rolFiltro === rol && styles.filtroBtnActive, cfg && { borderColor: cfg.text }]}
              onPress={() => setRolFiltro(rol)}
            >
              <Text style={[styles.filtroText, rolFiltro === rol && styles.filtroTextActive]}>
                {cfg ? `${cfg.emoji} ${rol}` : rol}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          const esYo = item.id === user?.uid;
          const rolCfg = ROL_COLORES[item.rol] || ROL_COLORES['Técnico'];
          return (
            <View style={[styles.card, esYo && styles.cardYo]}>
              <Avatar nombre={item.nombre} color={COLORES_AVATAR[index % COLORES_AVATAR.length]} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardNombre}>{item.nombre}{esYo ? ' (tú)' : ''}</Text>
                <Text style={styles.cardEmail}>{item.email}</Text>
                {item.creadoEn ? <Text style={styles.cardFecha}>Registrado: {formatFecha(item.creadoEn)}</Text> : null}
              </View>
              <View style={[styles.rolBadge, { backgroundColor: rolCfg.bg }]}>
                <Text style={[styles.rolText, { color: rolCfg.text }]}>{rolCfg.emoji} {item.rol}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Sin usuarios en esta categoría.</Text>}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
      />
    </View>
  );
}

const PURPLE = '#6D28D9';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: PURPLE, padding: 18, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginTop: 12, marginBottom: 4 },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filtroBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filtroText: { fontSize: 12, fontWeight: '600', color: '#555' },
  filtroTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 12 },
  cardYo: { borderWidth: 2, borderColor: PURPLE },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  cardEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  cardFecha: { fontSize: 11, color: '#aaa', marginTop: 2 },
  rolBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'center' },
  rolText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
});
