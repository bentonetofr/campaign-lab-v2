import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vorterium — O coração da sua campanha",
  description: "Organize campanhas de RPG de mesa, fichas, sessões e rolagens em um só lugar."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
