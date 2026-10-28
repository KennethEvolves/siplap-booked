import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans", // debe llamarse --font-sans para que coincida con globals.css
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SIAPL-BOOKED | Universidad de Oriente",
  description: "Panel de Superusuario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
      <body
        className="min-h-screen flex flex-col antialiased bg-background text-foreground text-base"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}