/*
 * @Author: garyxuan
 * @Date: 2025-01-03 17:58:28
 * @Description: 
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/lan-chat/',
    server: {
        port: 3001,
        host: true
    }
}); 