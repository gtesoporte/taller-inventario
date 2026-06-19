import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
});
