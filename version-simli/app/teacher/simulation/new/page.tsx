/**
 * simulation/new/page.tsx — teacher
 * Create new simulation with Stitch form layout.
 */

import { SimulationForm } from "@/components/SimulationForm";
import { requireRole } from "@/lib/auth-helpers";

/**
 * Create new simulation.
 */
export default async function NewSimulationPage(): Promise<React.ReactElement> {
  const profile = await requireRole("teacher");
  return <SimulationForm teacherId={profile.id} professorName={profile.full_name ?? "Professor"} />;
}
