const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// lucide-react-native distribuye sus iconos como .mjs (uno por icono);
// Metro no indexa esa extensión por defecto y falla al resolverlos.
config.resolver.sourceExts.push('mjs');

module.exports = config;
