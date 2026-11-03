// Formati italiani (principio 8): euro, virgola decimale, date nel fuso Europe/Rome.
// Importi e quantità arrivano come testo decimale esatto (come da NUMERIC), mai come numeri
// in virgola mobile. Qui non si arrotonda: gli arrotondamenti stanno in un solo punto, nel
// motore dei prezzi. Il punto delle migliaia c'è sempre, anche a quattro cifre (1.234,50 €),
// come nei documenti commerciali; lo standard italiano di Intl lo ometterebbe.

export const timeZone = "Europe/Rome";

const decimalPattern = /^-?\d+(\.\d+)?$/;

function checkDecimal(value: string): string {
  if (!decimalPattern.test(value)) throw new Error(`Valore decimale non valido: «${value}»`);
  return value;
}

function fractionDigits(value: string): number {
  return value.split(".")[1]?.length ?? 0;
}

const euroFormat = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

// Un importo con più di due decimali va arrotondato prima, dal motore dei prezzi.
export function formatEuro(amount: string): string {
  checkDecimal(amount);
  if (fractionDigits(amount) > 2) {
    throw new Error(`Importo con più di due decimali, da arrotondare prima: «${amount}»`);
  }
  return euroFormat.format(amount as Intl.StringNumericLiteral);
}

// Quantità e altri numeri: tutte le cifre decimali ricevute, nessuna aggiunta né tolta.
export function formatDecimal(value: string): string {
  checkDecimal(value);
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: fractionDigits(value),
    useGrouping: "always",
  }).format(value as Intl.StringNumericLiteral);
}

const dateFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error(`Data non valida: «${String(value)}»`);
  return date;
}

export function formatDate(value: Date | string): string {
  return dateFormat.format(toDate(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(toDate(value));
}
