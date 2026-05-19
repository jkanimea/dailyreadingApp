module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/www/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic/core|@ionic/angular|@stencil/core|ionicons)'
  ]
};
