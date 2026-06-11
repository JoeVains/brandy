import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brandy — Digital Asset Management",
  description: "Manage your brand assets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
