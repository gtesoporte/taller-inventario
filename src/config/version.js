// EXPO_PUBLIC_BUILD lo fija Netlify en el build (ver netlify.toml) con el commit
// desplegado; en desarrollo local no existe. Se lee literal para que Expo lo inyecte.
export const VERSION = (process.env.EXPO_PUBLIC_BUILD || 'dev').slice(0, 7);
