import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pupuce Intelligence — Atelier de recherche",
  description:
    "Un espace pour explorer, sélectionner et préparer des recherches en histoire de l’art et archéologie.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
