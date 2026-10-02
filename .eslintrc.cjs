module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error'
  },
  overrides: [
    {
      files: ['src/renderer/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'electron',
                message: 'Do not import electron in renderer. Use window.api from preload.'
              },
              {
                name: 'node:fs',
                message: 'Do not import node builtins in renderer.'
              },
              {
                name: 'fs',
                message: 'Do not import node builtins in renderer.'
              },
              {
                name: 'node:path',
                message: 'Do not import node builtins in renderer.'
              },
              {
                name: 'path',
                message: 'Do not import node builtins in renderer.'
              },
              {
                name: 'node:child_process',
                message: 'Do not import node builtins in renderer.'
              },
              {
                name: 'child_process',
                message: 'Do not import node builtins in renderer.'
              }
            ],
            patterns: [
              {
                group: ['node:*'],
                message: 'Do not import node builtins in renderer.'
              }
            ]
          }
        ]
      }
    }
  ],
  ignorePatterns: ['node_modules', 'dist', 'out']
}
