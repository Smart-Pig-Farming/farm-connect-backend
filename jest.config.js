module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  verbose: false,
  globalSetup: "<rootDir>/src/tests/jest.globalSetup.ts",
};
