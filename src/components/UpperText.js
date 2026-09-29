import React from 'react';
import { Text } from 'react-native';

// Fuerza mayúsculas (estandarización visual) y la tipografía de marca (Montserrat)
// en todo texto de la app. `style` puede sobreescribir fontFamily si hace falta.
export default function UpperText({ style, children, ...rest }) {
  return (
    <Text style={[{ textTransform: 'uppercase', fontFamily: 'Montserrat' }, style]} {...rest}>
      {children}
    </Text>
  );
}
