import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    exclude: ["tests/**/*", "node_modules/**"],
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "app/**/actions.ts",
        "lib/**/*.ts",
        "app/api/**/route.ts",
        "app/auth/**/route.ts",
      ],
      exclude: ["**/*.d.ts", "**/types/**", "lib/version.ts"],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 90,
        lines: 88,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
