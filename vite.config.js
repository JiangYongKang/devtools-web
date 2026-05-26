import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: process.env.VITEST ? {} : {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.BABEL_ENV': JSON.stringify(process.env.BABEL_ENV || process.env.NODE_ENV || 'development'),
    'process.env.BABEL_8_BREAKING': 'false',
    'process.env.BABEL_TYPES_8_BREAKING': 'false',
    'process.env.BABEL_SHOW_CONFIG_FOR': 'undefined',
    'process.env.DEBUG': 'undefined',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.js'],
  },
})
