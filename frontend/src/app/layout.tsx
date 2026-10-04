import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google"; // Importamos una fuente moderna
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Pesos ideales para titulos y textos
});

export const metadata: Metadata = {
  title: "SIAPL-BOOKED Dashboard",
  description: "Panel de Superusuario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`${jakarta.className} min-h-screen flex flex-col antialiased bg-slate-50 text-slate-800 text-base`}
      >
        {children}
      </body>
    </html>
  );
}