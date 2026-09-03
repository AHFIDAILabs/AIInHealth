import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setupEnv.ts'],
    include: ['src/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // One shared in-memory Mongo instance for the whole run (see globalSetup.ts) —
    // running test files in parallel worker processes against it is fine for reads,
    // but each file resets/reseeds the same collections in afterEach, so parallel
    // files would race each other's data. Single-process/serial keeps that simple.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/scripts/**', 'src/**/*.test.ts'],
    },
  },
});
