module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: [],
  collectCoverageFrom: [
    "**/*.{ts}",
    "!**/TestUtils/**",
    "!**/website/**",
    "!**/node_modules/**",
    "!**/vendor/**"
  ]
};
