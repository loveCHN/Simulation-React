import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { resolvePkgPath } from '../rollup/utils';
import replace from '@rollup/plugin-replace';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
      jsxImportSource: undefined
    }),
    replace({
      __DEV__: true,
      preventAssignment: true
    })
  ],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: resolvePkgPath('react')
      },
      {
        find: 'react-dom',
        replacement: resolvePkgPath('react-dom')
      },
      {
        find: 'hostConfig',
        replacement: resolve(resolvePkgPath('react-dom'), './src/hostConfig.ts')
      }
    ]
  },
  optimizeDeps: {
    disabled: true
  }
});
