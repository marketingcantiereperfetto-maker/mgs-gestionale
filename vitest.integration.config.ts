import { defineConfig } from "vitest/config";

// Prove di integrazione sul Supabase locale: le avvia «npm run test:db», che passa indirizzo e
// chiave pubblica locali (mai quelli del cloud).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
  },
});
