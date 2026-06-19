import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAUwT5OmzzvYIwS_D3i4Un6HVGRXDgLaHI',
  authDomain: 'taller-inventario-46a17.firebaseapp.com',
  projectId: 'taller-inventario-46a17',
  storageBucket: 'taller-inventario-46a17.firebasestorage.app',
  messagingSenderId: '792090857243',
  appId: '1:792090857243:web:e4717c7d3d17231ae34dbe',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
