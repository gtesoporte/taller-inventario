import { Alert, Platform } from 'react-native';

// Alert.alert no hace nada en react-native-web (es un stub vacío), así que en web
// usamos los diálogos nativos del navegador para que confirmaciones y avisos funcionen.
export function mostrarAlerta(title, message, buttons) {
  if (Platform.OS !== 'web') {
    return Alert.alert(title, message, buttons);
  }
  const texto = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(texto);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b !== cancelBtn) || buttons[0];
  if (window.confirm(texto)) actionBtn?.onPress?.();
  else cancelBtn?.onPress?.();
}
