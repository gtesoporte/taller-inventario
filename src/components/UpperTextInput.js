import React from 'react';
import { TextInput } from 'react-native';

// Fuerza mayúsculas visualmente (valor y placeholder) sin alterar el dato capturado,
// y aplica la tipografía de marca (Montserrat).
export default function UpperTextInput({ style, ...rest }) {
  return <TextInput style={[{ textTransform: 'uppercase', fontFamily: 'Montserrat' }, style]} {...rest} />;
}
