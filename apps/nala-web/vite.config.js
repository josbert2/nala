import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El engine (canvas) y los assets se reusan por symlink desde el proyecto
// Electron. preserveSymlinks mantiene las rutas dentro del app para que los
// imports del engine (./engine/*) y las rutas de assets sigan resolviendo.
export default defineConfig({
  plugins: [react()],
  resolve: { preserveSymlinks: true },
  server: { fs: { allow: ['..', '../..'] }, host: true }
})
