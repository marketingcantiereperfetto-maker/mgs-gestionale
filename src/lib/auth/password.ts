export const minPasswordLength = 12;

export type PasswordError = { code?: string | undefined; name?: string };

// Errori di Supabase che indicano una sessione non più valida.
const sessionErrorCodes = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "bad_jwt",
  "no_authorization",
  "reauthentication_needed",
]);

// Traduce l'errore di Supabase sul salvataggio della password in un messaggio chiaro.
export function passwordErrorMessage(error: PasswordError): string {
  if (error.code === "same_password") return "Scegli una password diversa da quella attuale.";
  if (error.code === "weak_password") {
    return `Password troppo debole o troppo corta: usa almeno ${minPasswordLength} caratteri.`;
  }
  if (error.name === "AuthSessionMissingError" || sessionErrorCodes.has(error.code ?? "")) {
    return "La sessione è scaduta. Accedi di nuovo; se non hai ancora una password, chiedi al titolare un nuovo invito.";
  }
  return "Non è stato possibile salvare la password. Riprova.";
}
