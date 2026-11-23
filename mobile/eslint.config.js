// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],

    rules: {
      /**
       * Loading data on mount is the point of these effects: every screen
       * fetches its own data into state, so the "call fetch, then setState"
       * shape is intentional and not a cascading-render bug. Downgraded to a
       * warning rather than disabled, so a genuine accidental setState in an
       * effect still surfaces in the report.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
