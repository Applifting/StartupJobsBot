module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [],
  "collectCoverageFrom": [
    "**/*.{ts}",
    "!**/TestUtils/**",
    "!**/node_modules/**",
    "!**/vendor/**"
  ]
};