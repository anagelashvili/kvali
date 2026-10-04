import type { Metadata } from "next";
import { Archivo, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-syne" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "Kvali",
  description: "Tbilisi's tattoo artists, by style.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${syne.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
