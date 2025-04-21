module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  env: {
    browser: true,
    node: true,
    es6: true
  },
  rules: {
    // 自定义规则
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    'no-console': 'warn'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  ignorePatterns: ['node_modules/**', 'dist/**', 'build/**', '.vscode/**']
};
