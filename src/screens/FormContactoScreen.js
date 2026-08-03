import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import Text from '../components/UpperText';
import TextInput from '../components/UpperTextInput';
import { addContacto, updateContacto } from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

export default function FormContactoScreen({ navigation, route }) {
  const { perfil } = useAuth();
  const { id, contacto } = route?.params || {};
  const esEdicion = !!id && !!contacto;

  const [nombre, setNombre] = useState(contacto?.nombre || '');
  const [activoFracttal, setActivoFracttal] = useState(contacto?.activoFracttal || '');
  const [codigo, setCodigo] = useState(contacto?.codigo || '');
  const [ciudad, setCiudad] = useState(contacto?.ciudad || '');
  const [email, setEmail] = useState(contacto?.email || '');
  const [contactoNombre, setContactoNombre] = useState(contacto?.contacto || '');
  const [telefono, setTelefono] = useState(contacto?.telefono || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  const handleGuardar = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        activoFracttal: activoFracttal.trim() || null,
        codigo: codigo.trim() || null,
        ciudad: ciudad.trim() || null,
        email: email.trim() || null,
        contacto: contactoNombre.trim() || null,
        telefono: telefono.trim() || null,
      };
      if (esEdicion) {
        await updateContacto(id, data);
      } else {
        await addContacto(data, perfil);
      }
      setGuardado(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch {
      setError('No se pudo guardar el contacto. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (!esAdmin(perfil)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Acceso restringido</Text>
        </View>
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>
            Solo los administradores pueden crear o editar contactos.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{esEdicion ? 'Editar contacto' : 'Nuevo contacto'}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Campo label="NOMBRE *">
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={v => { setNombre(v); setError(''); }}
            placeholder="Ej: Laboratorios Arriaga"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="ACTIVO FRACTTAL">
          <TextInput
            style={styles.input}
            value={activoFracttal}
            onChangeText={setActivoFracttal}
            placeholder="Nombre del activo en Fracttal"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="CÓDIGO">
          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="Ej: 1442"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="CIUDAD">
          <TextInput
            style={styles.input}
            value={ciudad}
            onChangeText={setCiudad}
            placeholder="Ej: Tuxtla Gutiérrez"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="CONTACTO">
          <TextInput
            style={styles.input}
            value={contactoNombre}
            onChangeText={setContactoNombre}
            placeholder="Nombre de la persona de contacto"
            placeholderTextColor="#bbb"
          />
        </Campo>

        <Campo label="TELÉFONO">
          <TextInput
            style={styles.input}
            value={telefono}
            onChangeText={setTelefono}
            placeholder="Ej: 961 244 4215"
            placeholderTextColor="#bbb"
            keyboardType="phone-pad"
          />
        </Campo>

        <Campo label="EMAIL">
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#bbb"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Campo>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {guardado && (
          <View style={styles.exitoBox}>
            <Text style={styles.exitoText}>✅ {esEdicion ? 'Contacto actualizado.' : 'Contacto registrado.'}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.btn, guardado && styles.btnExito]} onPress={handleGuardar} disabled={guardando || guardado}>
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{esEdicion ? 'Guardar cambios' : 'Guardar contacto'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Campo({ label, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const AZUL = '#0B2447';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  body: { flex: 1, padding: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', color: '#1a1a2e' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  errorText: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  exitoBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#A5D6A7' },
  exitoText: { color: '#2E7D32', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#1976D2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  btnExito: { backgroundColor: '#2E7D32' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
