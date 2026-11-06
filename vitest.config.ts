import { defineConfig } from "vitest/config";

// Prove veloci senza database. Le prove di integrazione (tests/integration) girano solo sul
// Supabase locale, dentro «npm run test:db» (vedi vitest.integration.config.ts).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/golden/**/*.test.ts"],
    environment: "node",
  },
});
