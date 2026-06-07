/**
 * layout.tsx — teacher section
 * Professor portal shell with Stitch sidebar navigation.
 */

export const dynamic = "force-dynamic";

import { Inter, JetBrains_Mono } from "next/font/google";
import { ProfessorShell } from "@/components/shared/Sidebar";
import { requireRole } from "@/lib/auth-helpers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Teacher layout wrapper with professor sidebar shell.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const profile = await requireRole("teacher");

  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <ProfessorShell userName={profile.full_name ?? ""}>{children}</ProfessorShell>
    </div>
  );
}
