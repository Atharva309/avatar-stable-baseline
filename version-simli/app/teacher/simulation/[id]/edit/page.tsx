/**
 * simulation/[id]/edit/page.tsx — teacher
 * Edit existing simulation with Stitch form layout.
 */

import { redirect } from "next/navigation";
import { SimulationForm } from "@/components/SimulationForm";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import type { Simulation } from "@/types";

type PageProps = { params: { id: string } };

/**
 * Edit existing simulation.
 */
export default async function EditSimulationPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const { data } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", params.id)
    .eq("teacher_id", profile.id)
    .single();

  if (!data) redirect("/teacher/dashboard");

  return (
    <SimulationForm
      teacherId={profile.id}
      initial={data as Simulation}
      professorName={profile.full_name ?? "Professor"}
    />
  );
}
