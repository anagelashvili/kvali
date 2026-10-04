import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kvali",
  description: "Tbilisi's tattoo artists, by style.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
