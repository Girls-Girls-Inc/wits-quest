import js from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import cssPlugin from '@eslint/css';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  // JavaScript & JSX (with React)
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: pluginReact,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...pluginReact.configs.flat.recommended.rules,
    },
  },

  // Ignored paths
  {
    ignores: ['node_modules/', 'build/', 'dist/'],
  },
]);

