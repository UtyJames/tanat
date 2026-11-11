import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The test shim runs a real SQLite database per suite. One fork keeps
    // memory bounded on small CI runners and low-disk Windows machines.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
