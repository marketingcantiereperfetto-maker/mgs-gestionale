// Controlli su partita IVA, codice fiscale e IBAN (decisioni del 3 novembre 2026).
// Ricevono il valore già normalizzato con normalizeCode.

export function normalizeCode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

// Partita IVA: 11 cifre, l'ultima di controllo (algoritmo di Luhn come per le partite IVA).
export function isValidVatNumber(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index++) {
    const digit = Number(value[index]);
    if (index % 2 === 0) sum += digit;
    else sum += digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
  }
  return (10 - (sum % 10)) % 10 === Number(value[10]);
}

// Valori dei caratteri in posizione dispari (1ª, 3ª, …) per il carattere di controllo.
const oddValues: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

function evenValue(char: string): number {
  return /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 65;
}

// Cognome, nome, anno, mese, giorno e comune; le cifre possono essere sostituite da lettere
// (omocodia).
const personTaxCodePattern =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

// Codice fiscale: 16 caratteri (persone) con carattere di controllo, oppure 11 cifre
// (società, stesso controllo della partita IVA).
export function isValidTaxCode(value: string): boolean {
  if (/^\d{11}$/.test(value)) return isValidVatNumber(value);
  if (!personTaxCodePattern.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 15; index++) {
    const char = value[index]!;
    sum += index % 2 === 0 ? oddValues[char]! : evenValue(char);
  }
  return String.fromCharCode(65 + (sum % 26)) === value[15];
}

// IBAN di qualunque paese: struttura e cifre di controllo (resto 1 nella divisione per 97).
export function isValidIban(value: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  const rearranged = value.slice(4) + value.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

// IBAN leggibile a gruppi di quattro: IT60 X054 2811 1010 0000 0123 456.
export function formatIban(value: string): string {
  return value.replace(/(.{4})/g, "$1 ").trim();
}
