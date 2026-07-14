import React from 'react';
import { TextInput } from 'react-native';

// Fuerza mayúsculas visualmente (valor y placeholder) sin alterar el dato capturado.
export default function UpperTextInput({ style, ...rest }) {
  return <TextInput style={[{ textTransform: 'uppercase' }, style]} {...rest} />;
}
