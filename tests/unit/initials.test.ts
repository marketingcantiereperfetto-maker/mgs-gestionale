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
