/**
 * simulation/[id]/results/page.tsx — teacher
 * Simulation results with attempts table and leaderboard.
 */

import { redirect } from "next/navigation";
import { TeacherResultsClient } from "@/components/TeacherResultsClient";
import { LEADERBOARD_QUERY_LIMIT } from "@/lib/constants";
import { buildLeaderboard } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import type { StageScore } from "@/types";

type PageProps = { params: { id: string } };

/**
 * Teacher view of student attempts and leaderboard.
 */
export default async function TeacherResultsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  await requireRole("teacher");
  const supabase = createClient();

  const { data: simulation } = await supabase
    .from("simulations")
    .select("title, persona_name, persona_role, product_context")
    .eq("id", params.id)
    .single();

  if (!simulation) redirect("/teacher/dashboard");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, students(display_name), stage_scores(*)")
    .eq("simulation_id", params.id)
    .order("started_at", { ascending: false });

  const { data: completed } = await supabase
    .from("attempts")
    .select(
      `
      id,
      student_id,
      total_score,
      completed_at,
      students (
        display_name
      )
    `
    )
    .eq("simulation_id", params.id)
    .eq("status", "completed")
    .order("total_score", { ascending: false })
    .limit(LEADERBOARD_QUERY_LIMIT);

  const leaderboard = buildLeaderboard(
    (completed ?? []) as Parameters<typeof buildLeaderboard>[0]
  );

  const stageScoresByAttempt: Record<string, StageScore[]> = {};
  (attempts ?? []).forEach((row) => {
    const scores = (row as { stage_scores?: StageScore[] }).stage_scores ?? [];
    if (row.status === "completed") {
      stageScoresByAttempt[row.id] = scores;
    }
  });

  const subtitle = [simulation.persona_role, simulation.product_context?.slice(0, 40)]
    .filter(Boolean)
    .join(" · ");

  return (
    <TeacherResultsClient
      attempts={(attempts ?? []) as Parameters<typeof TeacherResultsClient>[0]["attempts"]}
      leaderboard={leaderboard}
      stageScoresByAttempt={stageScoresByAttempt}
      simulationTitle={simulation.title}
      simulationSubtitle={subtitle || undefined}
    />
  );
}
