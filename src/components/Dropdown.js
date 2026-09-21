import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Text from './UpperText';

// Lista desplegable. `opciones` es un arreglo de strings o de { value, label }.
export default function Dropdown({ value, opciones, onChange, placeholder = 'Seleccionar...', titulo, style }) {
  const [abierto, setAbierto] = useState(false);

  const items = opciones.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const actual = items.find(i => i.value === value);

  const elegir = (v) => {
    setAbierto(false);
    onChange(v);
  };

  return (
    <>
      <TouchableOpacity style={[styles.trigger, style]} onPress={() => setAbierto(true)}>
        <Text style={[styles.triggerText, !actual && styles.placeholder]} numberOfLines={1}>
          {actual ? actual.label : placeholder}
        </Text>
        <Text style={styles.flecha}>▼</Text>
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAbierto(false)}>
          <TouchableOpacity style={styles.card} activeOpacity={1}>
            {!!titulo && <Text style={styles.titulo}>{titulo}</Text>}
            <ScrollView>
              {items.map(i => {
                const activo = i.value === value;
                return (
                  <TouchableOpacity key={String(i.value)} style={[styles.opcion, activo && styles.opcionActiva]} onPress={() => elegir(i.value)}>
                    <Text style={[styles.opcionText, activo && styles.opcionTextActiva]}>{i.label}</Text>
                    {activo && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  placeholder: { color: '#aaa', fontWeight: '400' },
  flecha: { fontSize: 10, color: '#888' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, maxHeight: 420, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, overflow: 'hidden' },
  titulo: { fontSize: 12, fontWeight: '800', color: '#888', letterSpacing: 0.5, paddingHorizontal: 18, paddingVertical: 10 },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  opcionActiva: { backgroundColor: '#EEF2F7' },
  opcionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  opcionTextActiva: { color: AZUL, fontWeight: '800' },
  check: { fontSize: 16, color: AZUL, fontWeight: '800' },
});
