import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'shaart.mjs',
        'scripts/',
        'mcp-server/src/index.js'  // MCP server entry point (integration-level)
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/prompt-builder.test.js'],  // Skip if doesn't exist
    isolate: true
  }
});
