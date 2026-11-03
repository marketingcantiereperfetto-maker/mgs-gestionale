"use client";

import { useEffect } from "react";

// Effetto «premuto» anche da tastiera: con Invio o Spazio tenuti giù su un pulsante (.button)
// si aggiunge [data-pressed], tolto al rilascio. Lo stile è in globals.css.
// L'ascoltatore di «touchstart» vuoto serve a Safari su iPhone per attivare :active al tocco.
export function PressFeedback() {
  useEffect(() => {
    function pressedButton(event: Event): HTMLElement | null {
      const target = event.target;
      return target instanceof HTMLElement && target.matches(".button") ? target : null;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " ")
        pressedButton(event)?.setAttribute("data-pressed", "");
    }
    function release(event: Event) {
      pressedButton(event)?.removeAttribute("data-pressed");
    }
    function onTouchStart() {}

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", release);
    document.addEventListener("focusout", release);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", release);
      document.removeEventListener("focusout", release);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, []);
  return null;
}
