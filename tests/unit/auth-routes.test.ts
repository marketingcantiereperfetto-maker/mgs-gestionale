import { describe, expect, it } from "vitest";
import { accessRedirect, isPublicPath, safeNextPath } from "@/lib/auth/routes";

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

  it("chi non ha ancora scelto la password viene sempre portato su /imposta-password", () => {
    for (const path of ["/", "/accedi", "/auth/conferma", "/impostazioni", "/preventivi/1"]) {
      expect(accessRedirect(path, "password-required")).toBe("/imposta-password");
    }
    expect(accessRedirect("/imposta-password", "password-required")).toBeNull();
  });

  it("dopo aver scelto la password si naviga liberamente", () => {
    expect(accessRedirect("/", "ready")).toBeNull();
    expect(accessRedirect("/imposta-password", "ready")).toBeNull();
  });

  it("chi non è collegato vede solo accesso e conferma dell'invito", () => {
    expect(accessRedirect("/", "anonymous")).toBe("/accedi");
    expect(accessRedirect("/imposta-password", "anonymous")).toBe("/accedi");
    expect(accessRedirect("/accedi", "anonymous")).toBeNull();
    expect(accessRedirect("/auth/conferma", "anonymous")).toBeNull();
  });
});
