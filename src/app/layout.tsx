import type { Metadata } from "next";
import { PressFeedback } from "@/components/press-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestionale MGS Group",
  description: "Gestionale di MGS Group",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="min-h-screen font-sans antialiased">
        <PressFeedback />
        {children}
      </body>
    </html>
  );
}
