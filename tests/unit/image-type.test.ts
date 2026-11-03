import { describe, expect, it } from "vitest";
import { checkLogo, detectImageType, maxLogoBytes } from "@/domain/files/image-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("riconoscimento dei loghi dal contenuto vero", () => {
  it("riconosce PNG, JPEG e WebP dai primi byte", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toEqual({
      mime: "image/png",
      extension: "png",
    });
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))?.extension).toBe("jpg");
    expect(detectImageType(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))?.extension).toBe("webp");
  });

  it("rifiuta testo, SVG, PDF e file troncati, qualunque nome abbiano", () => {
    expect(detectImageType(text("non sono un'immagine"))).toBeNull();
    expect(detectImageType(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(text("%PDF-1.7"))).toBeNull();
    expect(detectImageType(text("RIFF\u0000\u0000\u0000\u0000WAVE"))).toBeNull();
    expect(detectImageType(bytes(0x89, 0x50))).toBeNull();
  });

  it("controlla dimensione e contenuto con messaggi chiari", () => {
    expect(checkLogo(new Uint8Array())).toEqual({
      ok: false,
      error: "Scegli un file da caricare.",
    });
    const big = new Uint8Array(maxLogoBytes + 1);
    big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(checkLogo(big)).toEqual({
      ok: false,
      error: "Il logo supera 1 MB: riducilo e riprova.",
    });
    expect(checkLogo(text("ciao"))).toMatchObject({ ok: false });
    expect(checkLogo(bytes(0xff, 0xd8, 0xff, 0xdb))).toMatchObject({ ok: true });
  });
});
