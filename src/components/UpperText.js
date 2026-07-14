import React from 'react';
import { Text } from 'react-native';

// Fuerza mayúsculas en todo texto de la app (estandarización visual de textos).
export default function UpperText({ style, children, ...rest }) {
  return (
    <Text style={[{ textTransform: 'uppercase' }, style]} {...rest}>
      {children}
    </Text>
  );
}
