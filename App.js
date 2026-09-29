// Proyecto migrado y funcionando - 2026-07-03
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/screens/Navigation';

// Tipografía de marca (DISA: Poppins para títulos, Montserrat para el resto).
// Solo en web: es donde corre la app en la práctica (PWA), y así no hace falta
// empaquetar los archivos de fuente para los builds nativos.
function useCargarFuentesWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('disa-fonts')) return;
    const link = document.createElement('link');
    link.id = 'disa-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Montserrat:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);
}

export default function App() {
  useCargarFuentesWeb();
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Navigation />
    </AuthProvider>
  );
}
