import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// The commit the game was built from. High scores are stored per commit, so scores from older rules never count.
function commitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: './',
  define: { __COMMIT__: JSON.stringify(commitSha()) },
  build: {
    outDir: 'dist',
    // Two pages: the main game, and Little Green for reception-age children.
    rolldownOptions: { input: { main: 'index.html', little: 'little.html' } },
    chunkSizeWarningLimit: 2000
  },
  server: { port: 8080 }
});
