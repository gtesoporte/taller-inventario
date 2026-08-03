import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { suscribirContactos, importarContactos } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';
import { mostrarAlerta } from '../utils/confirmar';
import DrawerMenu from '../components/DrawerMenu';
import * as XLSX from 'xlsx';

function normalizarFila(row) {
  const get = (...keys) => {
    for (const k of Object.keys(row)) {
      const kn = k.trim().toLowerCase();
      if (keys.includes(kn)) {
        const v = row[k];
        return v == null ? '' : String(v).trim();
      }
    }
    return '';
  };
  return {
    activoFracttal: get('activo fracttal'),
    nombre: get('nombre'),
    codigo: get('codigo'),
    ciudad: get('ciudad'),
    email: get('email'),
    contacto: get('contacto'),
    telefono: get('telefono'),
  };
}

export default function ContactosScreen({ navigation }) {
  const { perfil } = useAuth();
  const puedeAdministrar = esAdmin(perfil);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [contactos, setContactos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    const unsub = suscribirContactos(data => { setContactos(data); setLoading(false); });
    return unsub;
  }, []);

  const contactosFiltrados = contactos.filter(c => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return [c.nombre, c.activoFracttal, c.ciudad, c.contacto, c.codigo, c.email]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  const importarExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setImportando(true);
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[1] || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const filas = rows.map(normalizarFila).filter(f => f.nombre);
        if (filas.length === 0) {
          mostrarAlerta('SIN DATOS', 'NO SE ENCONTRARON FILAS CON NOMBRE EN LA SEGUNDA HOJA DEL ARCHIVO.');
        } else {
          const count = await importarContactos(filas, perfil);
          mostrarAlerta('IMPORTACIÓN COMPLETA', `SE IMPORTARON ${count} CONTACTOS CORRECTAMENTE.`);
        }
      } catch (err) {
        console.error('Error al importar Excel:', err);
        mostrarAlerta('ERROR', `NO SE PUDO LEER O IMPORTAR EL ARCHIVO: ${err?.message || err}`);
      }
      setImportando(false);
    };
    input.click();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuAbierto(true)}>
            <Text style={styles.menuBtnIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>📇 Contactos</Text>
            <Text style={styles.headerSub}>{contactos.length} registrados</Text>
          </View>
        </View>
      </View>

      {puedeAdministrar && (
        <View style={styles.adminBtnsRow}>
          <TouchableOpacity style={styles.nuevaBtn} onPress={() => navigation.navigate('FormContacto')}>
            <Text style={styles.nuevaBtnText}>+ Nuevo contacto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importarBtn} onPress={importarExcel} disabled={importando}>
            {importando
              ? <ActivityIndicator color="#1565C0" size="small" />
              : <Text style={styles.importarBtnText}>📥 Importar Excel</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.search}
        placeholder="🔍  Buscar por nombre, ciudad, contacto o código..."
        placeholderTextColor="#aaa"
        value={filtro}
        onChangeText={setFiltro}
      />

      <FlatList
        data={contactosFiltrados}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetalleContacto', { id: item.id })}
          >
            <View style={styles.cardBody}>
              <Text style={styles.cardNombre}>{item.nombre}</Text>
              {item.activoFracttal ? <Text style={styles.cardSub}>🏢 {item.activoFracttal}</Text> : null}
              <View style={styles.cardRow}>
                {item.ciudad ? <Text style={styles.cardMeta}>📍 {item.ciudad}</Text> : null}
                {item.codigo ? <Text style={styles.cardMeta}>#{item.codigo}</Text> : null}
              </View>
              {item.contacto ? <Text style={styles.cardMeta}>👤 {item.contacto}</Text> : null}
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{filtro ? 'Sin resultados.' : 'No hay contactos registrados.'}</Text>
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
      />

      <DrawerMenu visible={menuAbierto} onClose={() => setMenuAbierto(false)} />
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  menuBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  menuBtnIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  adminBtnsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 14 },
  nuevaBtn: { flex: 1, backgroundColor: '#1976D2', borderRadius: 12, padding: 14, alignItems: 'center' },
  nuevaBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  importarBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#1565C0' },
  importarBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 13 },
  search: { marginHorizontal: 14, marginTop: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 10, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardBody: { flex: 1, gap: 3 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardSub: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  cardRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardMeta: { fontSize: 12, color: '#888' },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});
