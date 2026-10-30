// Lets Metro bundle expo-sqlite's SQLite WebAssembly file for the web target. Native is unaffected.
// (We only use the async SQLite API, so the web page does not need cross-origin isolation.)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
