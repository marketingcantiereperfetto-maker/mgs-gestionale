import { describe, expect, it } from "vitest";
import { passwordErrorMessage } from "@/lib/auth/password";

describe("messaggi di errore della password", () => {
  it("password uguale a quella attuale", () => {
    expect(passwordErrorMessage({ code: "same_password" })).toBe(
      "Scegli una password diversa da quella attuale.",
    );
  });

  it("password troppo debole o corta", () => {
    expect(passwordErrorMessage({ code: "weak_password" })).toBe(
      "Password troppo debole o troppo corta: usa almeno 12 caratteri con lettere, numeri e simboli.",
    );
  });

  it("sessione scaduta o mancante", () => {
    const expired =
      "La sessione è scaduta. Accedi di nuovo; se non hai ancora una password, chiedi al titolare un nuovo invito.";
    expect(passwordErrorMessage({ code: "session_not_found" })).toBe(expired);
    expect(passwordErrorMessage({ code: "refresh_token_not_found" })).toBe(expired);
    expect(passwordErrorMessage({ name: "AuthSessionMissingError" })).toBe(expired);
  });

  it("qualunque altro errore", () => {
    expect(passwordErrorMessage({ code: "unexpected_failure" })).toBe(
      "Non è stato possibile salvare la password. Riprova.",
    );
    expect(passwordErrorMessage({})).toBe("Non è stato possibile salvare la password. Riprova.");
  });
});
