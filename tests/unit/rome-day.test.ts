import { describe, expect, it } from "vitest";
import { isDay, romeDay, romeDayRange, romeMidnight } from "@/lib/rome-day";

const hours = (range: { start: Date; end: Date }) =>
  (range.end.getTime() - range.start.getTime()) / 3_600_000;
const inside = (range: { start: Date; end: Date }, iso: string) => {
  const instant = new Date(iso).getTime();
  return instant >= range.start.getTime() && instant < range.end.getTime();
};

describe("giornate intere in ora di Roma", () => {
  it("un giorno normale va dalla mezzanotte di Roma alla successiva", () => {
    const range = romeDayRange("2026-11-03");
    expect(range.start.toISOString()).toBe("2026-11-02T23:00:00.000Z");
    expect(hours(range)).toBe(24);
    expect(inside(range, "2026-11-02T23:00:00Z")).toBe(true); // 00:00 a Roma
    expect(inside(range, "2026-11-03T22:59:59Z")).toBe(true); // 23:59:59 a Roma
    expect(inside(range, "2026-11-03T23:00:00Z")).toBe(false); // già il 4
  });

  it("29 marzo 2026, passaggio all'ora legale: 23 ore, giornata intera compresa", () => {
    const range = romeDayRange("2026-03-29");
    expect(range.start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(hours(range)).toBe(23);
    expect(inside(range, "2026-03-28T23:30:00Z")).toBe(true); // 00:30 a Roma
    expect(inside(range, "2026-03-29T21:30:00Z")).toBe(true); // 23:30 a Roma (ora legale)
    expect(inside(range, "2026-03-29T22:00:00Z")).toBe(false); // 00:00 del 30
  });

  it("25 ottobre 2026, ritorno all'ora solare: 25 ore, giornata intera compresa", () => {
    const range = romeDayRange("2026-10-25");
    expect(range.start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(hours(range)).toBe(25);
    expect(inside(range, "2026-10-24T22:30:00Z")).toBe(true); // 00:30 a Roma
    expect(inside(range, "2026-10-25T22:30:00Z")).toBe(true); // 23:30 a Roma (ora solare)
  });

  it("più giornate: dal primo giorno all'ultimo compreso", () => {
    const range = romeDayRange("2026-10-24", "2026-10-26");
    expect(hours(range)).toBe(73);
  });

  it("riconosce solo date vere e il giorno di Roma di un istante", () => {
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("03/11/2026")).toBe(false);
    expect(() => romeMidnight("ieri")).toThrow(/non valido/);
    expect(romeDay(new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-03");
  });
});

describe("filtri del registro dall'indirizzo", () => {
  it("accetta solo valori validi e ignora il resto", async () => {
    const { parseAuditFilters, cursorParam } = await import("@/server/audit/queries");
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      parseAuditFilters({
        dal: "2026-03-29",
        al: "2026-02-30",
        persona: "sistema",
        tipo: "brand",
        societa: id,
        dopo: "2026-11-03T13:53:03.123456+00:00~42",
      }),
    ).toEqual({
      from: "2026-03-29",
      actor: "sistema",
      kind: "brand",
      companyId: id,
      after: { at: "2026-11-03T13:53:03.123456+00:00", id: 42 },
    });
    // Tentativi di inserire condizioni nel filtro vengono scartati.
    expect(
      parseAuditFilters({
        persona: "x,actor_id.is.null",
        tipo: "constructor",
        brand: `${id},or(id.gt.0)`,
        dopo: "2026-11-03T13:53:03Z~1),id.gt.(0",
      }),
    ).toEqual({});
    expect(cursorParam({ at: "2026-11-03T13:53:03Z", id: 7 })).toBe("2026-11-03T13:53:03Z~7");
  });
});
