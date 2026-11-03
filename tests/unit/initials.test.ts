import { describe, expect, it } from "vitest";
import { initials } from "@/lib/initials";

describe("iniziali dell'avatar", () => {
  it("usa il nome del profilo se c'è", () => {
    expect(initials("Mario Rossi", "m.rossi@prova.test")).toBe("MR");
    expect(initials("Anna", "anna@prova.test")).toBe("A");
    expect(initials("  maria grazia bianchi ", "x@prova.test")).toBe("MG");
  });

  it("senza nome usa le prime due lettere dell'email", () => {
    expect(initials(null, "francesco@prova.test")).toBe("FR");
    expect(initials("  ", "m.rossi@prova.test")).toBe("MR");
    expect(initials(null, "@prova.test")).toBe("?");
  });
});

describe("nome del profilo", () => {
  it("facoltativo, senza spazi in eccesso, al massimo 80 caratteri", async () => {
    const { parseFullName } = await import("@/domain/profile/name");
    expect(parseFullName("  Mario   Rossi ")).toEqual({ ok: true, value: "Mario Rossi" });
    expect(parseFullName("   ")).toEqual({ ok: true, value: null });
    expect(parseFullName("a".repeat(80))).toMatchObject({ ok: true });
    expect(parseFullName("a".repeat(81))).toEqual({
      ok: false,
      error: "Il nome può avere al massimo 80 caratteri.",
    });
  });
});
