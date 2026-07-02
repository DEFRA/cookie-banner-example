import { defineConfig, configDefaults } from 'vitest/config'

const sharedEnv = {
  NODE_ENV: 'test',
  GOOGLE_TAG_MANAGER_KEY: 'GTM-KFK7NV5W'
}

const coverageConfig = {
  provider: 'v8',
  reportsDirectory: './coverage',
  clean: false,
  reporter: ['text', 'lcov'],
  include: ['src/**'],
  exclude: [
    ...configDefaults.exclude,
    '**/test/**',
    'coverage',
    '.public'
  ]
}

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: coverageConfig,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.js'],
          globals: true,
          clearMocks: true,
          environment: 'node',
          env: sharedEnv
        }
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.js'],
          globals: true,
          clearMocks: true,
          environment: 'node',
          env: sharedEnv
        }
      }
    ]
  }
})
