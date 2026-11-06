import { defineConfig, devices } from "@playwright/test";
import { isLocalSupabase } from "./src/lib/supabase/test-project";

const port = 3100;

// Le prove nel browser girano solo sul Supabase locale (T0): «npm run test:e2e» azzera il
// database e passa indirizzo e chiavi locali, che non si stampano mai. Mai sul cloud.
if (!isLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error("Prove nel browser solo sul Supabase locale: usa «npm run test:e2e».");
}

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    // Se una prova fallisce resta la registrazione (pagine, richieste, schermate) per capirne
    // il motivo; le prove riuscite non lasciano nulla.
    trace: "retain-on-failure",
  },
  projects: [
    // Un solo accesso per ruolo a ogni giro: le sessioni salvate servono a tutte le prove.
    { name: "accessi", testMatch: /accessi\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["accessi"],
      testIgnore: /(setup-guide|dashboard-customers)\.spec\.ts/,
    },
    // Il percorso guidato guarda tutti i dati del database: la sua prova gira da sola, dopo
    // tutte le altre, così nessuna prova in parallelo ne falsa lo stato.
    {
      name: "percorso-guidato",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /setup-guide\.spec\.ts/,
      dependencies: ["chromium"],
    },
    // Il riquadro dei clienti da completare conta tutti i clienti attivi: gira da solo, dopo.
    {
      name: "riquadro-clienti",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /dashboard-customers\.spec\.ts/,
      dependencies: ["percorso-guidato"],
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    // Sempre un server nuovo, costruito con gli indirizzi locali: mai uno già acceso sul cloud.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
