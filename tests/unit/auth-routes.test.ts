import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath } from "@/lib/auth/routes";

describe("percorsi di accesso", () => {
  it("lascia aperte solo la pagina di accesso e la conferma dell'invito", () => {
    expect(isPublicPath("/accedi")).toBe(true);
    expect(isPublicPath("/auth/conferma")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/imposta-password")).toBe(false);
    expect(isPublicPath("/accedi-altro")).toBe(false);
  });

  it("dopo l'accesso rimanda solo a pagine interne", () => {
    expect(safeNextPath("/imposta-password")).toBe("/imposta-password");
    expect(safeNextPath("https://esempio.it")).toBe("/");
    expect(safeNextPath("//esempio.it")).toBe("/");
    expect(safeNextPath("/\\esempio.it")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
