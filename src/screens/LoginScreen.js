import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../config/firebase';

export default function LoginScreen() {
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recuperar, setRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exitoRecuperar, setExitoRecuperar] = useState(false);

  const limpiarError = () => setError('');

  const handleLogin = async () => {
    limpiarError();
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      const code = e?.code || '';
      if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-email')) {
        setError('Correo o contraseña incorrectos. Verifica tus datos.');
      } else if (code.includes('too-many-requests')) {
        setError('Demasiados intentos. Espera unos minutos o restablece tu contraseña.');
      } else if (code.includes('user-not-found')) {
        setError('No existe una cuenta con este correo.');
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async () => {
    const correo = emailRecuperar.trim() || email.trim();
    if (!correo) {
      setError('Escribe tu correo para recuperar el acceso.');
      return;
    }
    setEnviando(true);
    setExitoRecuperar(false);
    try {
      await sendPasswordResetEmail(auth, correo);
      setExitoRecuperar(true);
    } catch {
      setError('No se pudo enviar el correo. Verifica que la dirección sea correcta.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRegister = async () => {
    limpiarError();
    if (!email.trim() || !password || !nombre.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nombre: nombre.trim(),
        email: email.trim(),
        rol: 'Técnico',
        creadoEn: new Date().toISOString(),
      });
    } catch (e) {
      const code = e?.code || '';
      if (code.includes('email-already-in-use')) {
        setError('Ya existe una cuenta con este correo. Inicia sesión.');
      } else if (code.includes('invalid-email')) {
        setError('El formato del correo no es válido.');
      } else {
        setError(e.message || 'No se pudo crear la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cambiarTab = (nuevoTab) => {
    setTab(nuevoTab);
    limpiarError();
    setRecuperar(false);
    setExitoRecuperar(false);
  };

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.title}>Taller Soporte</Text>
        <Text style={styles.subtitle}>Sistema de gestión de refacciones</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
            onPress={() => cambiarTab('login')}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
            onPress={() => cambiarTab('register')}
          >
            <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        {tab === 'register' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Luis Ramírez"
              placeholderTextColor="#bbb"
              value={nombre}
              onChangeText={v => { setNombre(v); limpiarError(); }}
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@empresa.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={v => { setEmail(v); limpiarError(); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {!recuperar && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={v => { setPassword(v); limpiarError(); }}
              secureTextEntry
            />
          </View>
        )}

        {/* Error inline */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Panel recuperar contraseña */}
        {tab === 'login' && !recuperar && (
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => { setRecuperar(true); setEmailRecuperar(email.trim()); limpiarError(); }}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}

        {recuperar && (
          <View style={styles.recuperarBox}>
            <Text style={styles.recuperarTitulo}>Recuperar contraseña</Text>
            {exitoRecuperar ? (
              <View style={styles.exitoBox}>
                <Text style={styles.exitoText}>
                  ✅ Correo enviado a {emailRecuperar || email}. Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
                </Text>
                <TouchableOpacity onPress={() => { setRecuperar(false); setExitoRecuperar(false); setEmailRecuperar(''); }}>
                  <Text style={[styles.forgotText, { textAlign: 'center', marginTop: 12 }]}>Volver al inicio de sesión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.recuperarSub}>Te enviaremos un enlace para restablecer tu contraseña.</Text>
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#aaa"
                  value={emailRecuperar}
                  onChangeText={v => { setEmailRecuperar(v); limpiarError(); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.btn, { marginTop: 12 }]}
                  onPress={handleRecuperar}
                  disabled={enviando}
                >
                  {enviando
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Enviar correo de recuperación</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setRecuperar(false); setEmailRecuperar(''); limpiarError(); }}>
                  <Text style={[styles.forgotText, { textAlign: 'center', marginTop: 12 }]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {!recuperar && (
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={tab === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>🔑 {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
            }
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          {tab === 'login' ? '¿Primera vez? Crea una cuenta arriba.' : '¿Ya tienes cuenta? Inicia sesión arriba.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#EEF2F7' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  icon: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: AZUL, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: AZUL },
  tabText: { fontWeight: '600', color: '#888', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  exitoBox: { marginTop: 8 },
  exitoText: { color: '#2E7D32', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  btn: { backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  forgotText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },
  recuperarBox: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  recuperarTitulo: { fontSize: 16, fontWeight: '800', color: AZUL, marginBottom: 4 },
  recuperarSub: { fontSize: 13, color: '#666', lineHeight: 18 },
});
