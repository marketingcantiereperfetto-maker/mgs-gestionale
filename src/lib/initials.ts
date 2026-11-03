// Iniziali dell'avatar: dal nome del profilo se c'è, altrimenti le prime due lettere dell'email.
export function initials(fullName: string | null, email: string): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0]!)
      .join("")
      .toUpperCase();
  }
  const local = email.split("@")[0]!.replace(/[^\p{L}\p{N}]/gu, "");
  return local.slice(0, 2).toUpperCase() || "?";
}
