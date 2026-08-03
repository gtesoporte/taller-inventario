import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUsuario, crearPerfilUsuario } from '../config/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const p = await getUsuario(firebaseUser.uid);
          if (p) {
            setPerfil(p);
          } else {
            // Cuenta de Auth sin perfil en Firestore (ej. se borró el doc a mano):
            // se crea uno nuevo por default para que no quede "invisible".
            const nuevoPerfil = await crearPerfilUsuario(firebaseUser.uid, {
              nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              email: firebaseUser.email,
            });
            setPerfil(nuevoPerfil);
          }
        } else {
          setUser(null);
          setPerfil(null);
        }
      } catch {
        // Firestore error fetching profile — still allow navigation
        if (firebaseUser) setUser(firebaseUser);
        setPerfil(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
