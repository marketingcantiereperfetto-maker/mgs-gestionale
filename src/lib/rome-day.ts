import { timeZone } from "./format";

// Giornate intere in ora di Roma, per i filtri per data: dalla mezzanotte di Roma alla
// mezzanotte del giorno dopo. Nei giorni del cambio d'ora la giornata dura 23 o 25 ore.

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Differenza in millisecondi tra l'ora di Roma e l'ora UTC in un certo istante.
function romeOffset(instant: number): number {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(value: string): boolean {
  const match = dayPattern.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

// L'istante della mezzanotte di Roma all'inizio del giorno indicato (AAAA-MM-GG).
export function romeMidnight(day: string): Date {
  if (!isDay(day)) throw new Error(`Giorno non valido: «${day}»`);
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(year, month - 1, date);
  let instant = guess - romeOffset(guess);
  // Seconda correzione: serve se tra la stima e la mezzanotte cambia l'ora.
  instant = guess - romeOffset(instant);
  return new Date(instant);
}

export function nextDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

// Inizio incluso e fine esclusa di una o più giornate intere (dal … al …, estremi compresi).
export function romeDayRange(from: string, to: string = from): { start: Date; end: Date } {
  return { start: romeMidnight(from), end: romeMidnight(nextDay(to)) };
}

// Il giorno di Roma (AAAA-MM-GG) di un istante, per proporre «oggi» nei filtri.
export function romeDay(instant: Date): string {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
