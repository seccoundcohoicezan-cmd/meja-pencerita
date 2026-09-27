import globals from 'globals';
export default [{ files: ['src/**/*.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } },
  rules: { 'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'warn' } }];
