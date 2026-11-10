const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web loads SQLite as a WebAssembly file.
config.resolver.assetExts.push('wasm');

module.exports = config;
