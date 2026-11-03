import { defineConfig, devices } from "@playwright/test";

const port = 3100;

// Le variabili di .env.local servono ai test con utenti temporanei; i valori non si stampano.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Senza .env.local (per esempio su GitHub) quei test vengono saltati.
}

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /setup-guide\.spec\.ts/,
    },
    // Il percorso guidato guarda tutti i dati del database: la sua prova gira da sola, dopo
    // tutte le altre, così nessuna prova in parallelo ne falsa lo stato.
    {
      name: "percorso-guidato",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /setup-guide\.spec\.ts/,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
