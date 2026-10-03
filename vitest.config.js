import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.js', 'src/little/engine/**/*.js'],
      reporter: ['text', 'text-summary']
    }
  }
});
