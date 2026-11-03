import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Legge i colori da globals.css, così il test controlla quelli usati davvero.
const css = readFileSync("src/app/globals.css", "utf8");
const colors = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [match[1], match[2]]),
);

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(colors[foreground]!), luminance(colors[background]!)].sort(
    (a, b) => b - a,
  );
  return (light! + 0.05) / (dark! + 0.05);
}

// Coppie testo/sfondo usate nell'interfaccia. La barra semitrasparente sta sopra lo sfondo
// pagina: si controlla sul colore più scuro tra i due che possono comparire sotto (hover).
// Da non usare perché sotto il 4,5:1: testo blu azione sullo sfondo pagina (solo su schede
// bianche) e testo grigio secondario sulle righe evidenziate.
const pairs: [string, string][] = [
  ["ink", "page"],
  ["ink", "card"],
  ["ink", "hover"],
  ["ink", "secondary"],
  ["ink-muted", "page"],
  ["ink-muted", "card"],
  ["card", "action"],
  // Pulsanti da premuti.
  ["card", "action-pressed"],
  ["ink", "secondary-pressed"],
  ["action-pressed", "card"],
  ["action", "card"],
  ["info", "info-bg"],
  ["success", "success-bg"],
  ["warning", "warning-bg"],
  ["error", "card"],
];

describe("contrasto AA (almeno 4,5:1 per il testo normale)", () => {
  it.each(pairs)("%s su %s", (foreground, background) => {
    expect(colors[foreground], foreground).toBeDefined();
    expect(colors[background], background).toBeDefined();
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
