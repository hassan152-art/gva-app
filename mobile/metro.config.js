/**
 * Metro config.
 *
 * `src/app` is the route tree (Expo Router convention for a src directory),
 * everything else in `src` is plain modules.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
