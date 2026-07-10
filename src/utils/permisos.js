// Comparación case-insensitive: los roles en Firestore no siempre respetan
// mayúsculas/minúsculas de forma consistente.
export const esAdmin = (perfil) => (perfil?.rol || '').toLowerCase().includes('admin');
