import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'site-a': resolve(__dirname, 'src/sites/site-a/index.js'),
        'site-b': resolve(__dirname, 'src/sites/site-b/index.js'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
