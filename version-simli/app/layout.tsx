/**
 * layout.tsx
 * Root layout for PitchLab — light theme, toast provider.
 */

import type { Metadata } from "next";
import { ToastContainer } from "@/components/Toast";
import { ToastProvider } from "@/hooks/useToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchLab — AI Sales Training",
  description: "Practice sales conversations with AI-powered simulations",
};

/**
 * Root HTML wrapper for all routes.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-page text-text-primary antialiased">
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
