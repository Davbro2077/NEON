import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEON AI • Матрица Эйзенхауэра и Умный Планировщик",
  description:
    "Минималистичный AI Task Manager с голосовым Brain Dump, матрицей Эйзенхауэра, Turso и Gemini API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
