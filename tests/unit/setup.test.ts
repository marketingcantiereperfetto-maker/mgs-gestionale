import { describe, expect, it } from "vitest";

describe("ambiente di test", () => {
  it("usa il fuso orario di Roma per le date", () => {
    const date = new Date("2026-11-02T12:00:00Z");
    const roma = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    expect(roma).toBe("13:00");
  });
});
