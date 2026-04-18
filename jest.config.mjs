import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  clearMocks: true,
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  collectCoverageFrom: [
    "src/lib/auth.ts",
    "src/lib/google/oauth-routing.ts",
    "src/repositories/utils.ts",
    "src/services/auth.service.ts",
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/register/route.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageThreshold: {
    global: {
      statements: 92,
      branches: 88,
      functions: 100,
      lines: 92,
    },
  },
};

export default createJestConfig(customJestConfig);
