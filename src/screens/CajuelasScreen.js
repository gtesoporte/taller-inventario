import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CAJUELAS_LISTA, suscribirCajuelaInventario, suscribirCajuelaMovimientos } from '../config/firestore';

function useCajuelaResumen(cajuelaId) {
  const [refacciones, setRefacciones] = useState(0);
  const [piezas, setPiezas] = useState(0);
  useEffect(() => {
    const unsub = suscribirCajuelaInventario(cajuelaId, items => {
      setRefacciones(items.length);
      setPiezas(items.reduce((s, i) => s + (i.cantidad || 0), 0));
    });
    return unsub;
  }, [cajuelaId]);
  return { refacciones, piezas };
}

function CajuelaCard({ cajuela, navigation }) {
  const { refacciones, piezas } = useCajuelaResumen(cajuela.id);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DetalleCajuela', { cajuelaId: cajuela.id, nombre: cajuela.nombre })}
    >
      <View style={styles.cardIcon}><Text style={{ fontSize: 30 }}>🧰</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.cardNombre}>{cajuela.nombre}</Text>
        <Text style={styles.cardSub}>
          {refacciones} tipo{refacciones !== 1 ? 's' : ''} de refacción · {piezas} pz en stock
        </Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function CajuelasScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>🧰 Cajuelas</Text>
        <Text style={styles.sub}>Kits de refacciones para servicio</Text>
      </View>
      <FlatList
        data={CAJUELAS_LISTA}
        keyExtractor={c => c.id}
        renderItem={({ item }) => <CajuelaCard cajuela={item} navigation={navigation} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      />
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, elevation: 2 },
  cardIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardNombre: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 4 },
  cardArrow: { fontSize: 24, color: '#ccc', marginLeft: 8 },
});
