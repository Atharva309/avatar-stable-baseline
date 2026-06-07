/**
 * classes/[classId]/page.tsx — teacher
 * Manage a single class — students, simulations, join link.
 */

import Link from "next/link";
import { ClassManagementClient } from "@/components/ClassManagementClient";
import { MaterialIcon, ProfessorTopBar } from "@/components/shared/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import type { Simulation } from "@/types";

type PageProps = { params: { classId: string } };

/**
 * Class management page for professors.
 */
export default async function ClassManagementPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const { data: classRow } = await supabase
    .from("classes")
    .select("*")
    .eq("id", params.classId)
    .eq("professor_id", profile.id)
    .single();

  if (!classRow) {
    redirect("/teacher/dashboard");
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, username, display_name, joined_at")
    .eq("class_id", params.classId)
    .order("joined_at", { ascending: false });

  const { data: assignments } = await supabase
    .from("class_simulations")
    .select(
      `
      id,
      simulation_id,
      added_at,
      simulations (*)
    `
    )
    .eq("class_id", params.classId)
    .order("added_at", { ascending: false });

  const { data: professorSimulations } = await supabase
    .from("simulations")
    .select("*")
    .eq("teacher_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <ProfessorTopBar userName={profile.full_name ?? ""} />
      <main className="flex-1 max-w-container-max mx-auto px-margin-desktop py-8 w-full">
        <div className="mb-6">
          <Link
            href="/teacher/dashboard"
            className="group inline-flex items-center gap-2 text-secondary font-label-sm hover:underline"
          >
            <MaterialIcon name="arrow_back" className="text-[18px]" />
            Back to Dashboard
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="font-headline-lg text-headline-lg text-primary-container mb-1">{classRow.name}</h1>
          {classRow.description && (
            <p className="font-body-md text-body-md text-on-surface-variant">{classRow.description}</p>
          )}
        </div>

        <ClassManagementClient
          classId={classRow.id}
          joinCode={classRow.join_code}
          initialStudents={students ?? []}
          initialAssignments={(assignments ?? []) as Parameters<
            typeof ClassManagementClient
          >[0]["initialAssignments"]}
          professorSimulations={(professorSimulations ?? []) as Simulation[]}
        />
      </main>
    </>
  );
}
