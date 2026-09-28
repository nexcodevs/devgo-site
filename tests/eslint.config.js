// Configuração do ESLint para o JS do site (módulos ES rodando no navegador).
import js from '@eslint/js';
import globals from 'globals';

// Rode a partir da raiz do repositório: npm --prefix tests run lint
export default [
  { ignores: ['tests/node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-implicit-coercion': ['error', { allow: ['!!'] }],
      'no-param-reassign': 'error',
      'no-shadow': 'error',
      'no-console': ['error', { allow: ['error'] }],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      curly: ['error', 'multi-line'],
    },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
];
