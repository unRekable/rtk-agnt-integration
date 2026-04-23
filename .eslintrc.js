module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['__tests__/**/*.js', 'bin/**/*.js'],
      rules: {
        'no-undef': 'off'
      }
    }
  ]
};
