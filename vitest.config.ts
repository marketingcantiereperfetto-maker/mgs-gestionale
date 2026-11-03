import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: [
      "tests/unit/**/*.test.ts",
      "tests/golden/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    environment: "node",
    // Solo le variabili pubbliche: i test non usano mai la chiave segreta.
    env: loadEnv("test", process.cwd(), "NEXT_PUBLIC_"),
  },
});
