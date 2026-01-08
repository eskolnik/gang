import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './',
    logLevel: 'warn',
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2,
                drop_console: true, // Remove console.logs in production
            },
            mangle: true,
            format: {
                comments: false
            }
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    vendor: ['socket.io-client', 'pokersolver']
                }
            }
        }
    },
    server: {
        port: 8080
    },
    plugins: [
        react(),
        {
            name: 'build-msg',
            buildStart() {
                process.stdout.write(`🎮 Building The Gang for production...\n`);
            },
            buildEnd() {
                process.stdout.write(`✨ Client build complete ✨\n`);
            }
        }
    ]
});
