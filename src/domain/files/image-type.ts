// Riconoscimento dei loghi dal contenuto vero del file (decisioni del 3 novembre 2026):
// contano i primi byte, non il nome né il tipo dichiarato dal browser.

export const maxLogoBytes = 1024 * 1024;

export type ImageType = { mime: "image/png" | "image/jpeg" | "image/webp"; extension: string };

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const jpeg = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, png)) return { mime: "image/png", extension: "png" };
  if (startsWith(bytes, jpeg)) return { mime: "image/jpeg", extension: "jpg" };
  // WebP: «RIFF», 4 byte di lunghezza, poi «WEBP».
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

export type LogoCheck = { ok: true; type: ImageType } | { ok: false; error: string };

export function checkLogo(bytes: Uint8Array): LogoCheck {
  if (bytes.length === 0) return { ok: false, error: "Scegli un file da caricare." };
  if (bytes.length > maxLogoBytes) {
    return { ok: false, error: "Il logo supera 1 MB: riducilo e riprova." };
  }
  const type = detectImageType(bytes);
  if (!type) {
    return { ok: false, error: "Il file non è un'immagine PNG, JPEG o WebP." };
  }
  return { ok: true, type };
}
