import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../config/firebase';

export default function LoginScreen() {
  const { login } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [recuperar, setRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      Alert.alert('Error', 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async () => {
    const correo = emailRecuperar.trim() || email.trim();
    if (!correo) {
      Alert.alert('Ingresa tu correo', 'Escribe el correo con el que te registraste.');
      return;
    }
    setEnviando(true);
    try {
      await sendPasswordResetEmail(auth, correo);
      Alert.alert(
        'Correo enviado',
        `Revisa la bandeja de ${correo}. Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.`,
        [{ text: 'OK', onPress: () => { setRecuperar(false); setEmailRecuperar(''); } }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar el correo. Verifica que la dirección sea correcta.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !nombre) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nombre,
        email: email.trim(),
        rol: 'Técnico',
        creadoEn: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.title}>Taller Inventario</Text>
        <Text style={styles.subtitle}>Sistema de gestión de refacciones</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
            onPress={() => setTab('login')}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
            onPress={() => setTab('register')}
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
              value={nombre}
              onChangeText={setNombre}
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@empresa.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {tab === 'login' && !recuperar && (
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => { setRecuperar(true); setEmailRecuperar(email.trim()); }}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}

        {recuperar && (
          <View style={styles.recuperarBox}>
            <Text style={styles.recuperarTitulo}>Recuperar contraseña</Text>
            <Text style={styles.recuperarSub}>Te enviaremos un enlace para restablecer tu contraseña.</Text>
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Correo electrónico"
              value={emailRecuperar}
              onChangeText={setEmailRecuperar}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#aaa"
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
            <TouchableOpacity onPress={() => { setRecuperar(false); setEmailRecuperar(''); }}>
              <Text style={[styles.forgotText, { textAlign: 'center', marginTop: 12 }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!recuperar && (
          <TouchableOpacity
            style={styles.btn}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: AZUL },
  tabText: { fontWeight: '600', color: '#888', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#222',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btn: {
    backgroundColor: AZUL,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  forgotText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },
  recuperarBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recuperarTitulo: { fontSize: 16, fontWeight: '800', color: '#0B2447', marginBottom: 4 },
  recuperarSub: { fontSize: 13, color: '#666', lineHeight: 18 },
});
