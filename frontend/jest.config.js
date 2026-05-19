module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/www/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic/core|@ionic/angular|@stencil/core|ionicons)'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.module.ts',
    '!src/main.ts',
    '!src/polyfills.ts',
    '!src/zone-flags.ts',
    '!src/app/shared/components/**/*.ts'
  ],
  coverageReporters: ['html', 'lcov', 'text-summary', 'cobertura'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 35,
      statements: 35
    }
  }
};
