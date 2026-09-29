import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { host: true },
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
