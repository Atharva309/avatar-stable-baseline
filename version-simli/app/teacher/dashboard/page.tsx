/**
 * dashboard/page.tsx — teacher
 * Professor dashboard with classes grid and simulations table.
 */

import Link from "next/link";
import { TeacherClassesSection } from "@/components/TeacherClassesSection";
import { TeacherDashboardClient } from "@/components/TeacherDashboardClient";
import { MaterialIcon, ProfessorTopBar } from "@/components/shared/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import type { Simulation } from "@/types";

/**
 * Teacher dashboard — manage classes and simulations.
 */
export default async function TeacherDashboardPage(): Promise<React.ReactElement> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const { data: simulations } = await supabase
    .from("simulations")
    .select("*")
    .eq("teacher_id", profile.id)
    .order("created_at", { ascending: false });

  const list = (simulations ?? []) as Simulation[];

  return (
    <>
      <ProfessorTopBar userName={profile.full_name ?? ""} title="Professor Dashboard" />
      <main className="flex-1 px-margin-desktop py-lg max-w-container-max mx-auto w-full space-y-xl">
        {/* ── Welcome ─── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-display text-stitch-primary">Professor Dashboard</h1>
            <p className="text-on-surface-variant mt-1 text-body-md">
              Manage your curriculum and monitor student progress across your active cohorts.
            </p>
          </div>
        </section>

        {/* ── My Classes ─── */}
        <TeacherClassesSection />

        {/* ── My Simulations ─── */}
        <section className="space-y-lg">
          <div className="flex items-center justify-between border-b border-outline-variant pb-md gap-4">
            <div className="flex items-center gap-2">
              <MaterialIcon name="model_training" className="text-stitch-primary text-[24px]" />
              <h2 className="font-headline-md text-headline-md text-stitch-primary">My Simulations</h2>
            </div>
            <Link
              href="/teacher/simulation/new"
              className="flex items-center gap-2 px-md py-2.5 border-2 border-stitch-primary text-stitch-primary rounded-lg hover:bg-primary-container hover:text-white transition-all font-label-md active:scale-95 shrink-0"
            >
              <MaterialIcon name="rocket_launch" className="text-[18px]" />
              Create New Simulation
            </Link>
          </div>
          <TeacherDashboardClient initialSimulations={list} />
        </section>
      </main>
    </>
  );
}
