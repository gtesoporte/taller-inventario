import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import TextInput from './UpperTextInput';

// Barra de búsqueda con icono Lucide (antes el ícono de lupa iba como emoji
// dentro del placeholder). El `style` del llamador (fondo, borde, radio,
// margen, padding) se aplica al contenedor completo, no solo al input.
export default function SearchInput({ style, textStyle, iconColor = '#999', iconSize = 16, ...rest }) {
  return (
    <View style={[styles.wrap, style]}>
      <Search size={iconSize} color={iconColor} />
      <TextInput style={[styles.input, textStyle]} placeholderTextColor="#aaa" {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 14, color: '#222' },
});
