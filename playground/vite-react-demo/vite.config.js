import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
      jsxImportSource: undefined
    })
  ],
  optimizeDeps: {
    disabled: true
  },
  resolve: {
    alias: {
      react: resolve(__dirname, '../../dist/node_modules/react'),
      'react-dom': resolve(__dirname, '../../dist/node_modules/react-dom')
    }
  }
});
