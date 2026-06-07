/**
 * TeacherDashboardClient.tsx
 * Teacher simulation table with publish, edit, delete, and toasts.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { MaterialIcon } from "@/components/shared/Sidebar";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import type { Simulation } from "@/types";

type TeacherDashboardClientProps = {
  initialSimulations: Simulation[];
};

/**
 * Interactive teacher dashboard — CRUD actions with confirmation and toasts.
 */
export function TeacherDashboardClient({
  initialSimulations,
}: TeacherDashboardClientProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const [simulations, setSimulations] = useState(initialSimulations);
  const [deleteTarget, setDeleteTarget] = useState<Simulation | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);

  const handleTogglePublish = async (sim: Simulation): Promise<void> => {
    setIsBusy(sim.id);
    const supabase = createClient();
    const nextPublished = !sim.is_published;
    const { error } = await supabase
      .from("simulations")
      .update({ is_published: nextPublished })
      .eq("id", sim.id);

    setIsBusy(null);
    if (error) {
      showToast("Something went wrong. Please try again.", "error");
      return;
    }

    setSimulations((prev) =>
      prev.map((s) => (s.id === sim.id ? { ...s, is_published: nextPublished } : s))
    );
    showToast(
      nextPublished ? "Simulation published" : "Simulation unpublished",
      "success"
    );
    router.refresh();
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;

    if (deleteTarget.is_published) {
      showToast("Unpublish this simulation before deleting it", "error");
      setDeleteTarget(null);
      return;
    }

    setIsBusy(deleteTarget.id);
    const supabase = createClient();
    const { error } = await supabase.from("simulations").delete().eq("id", deleteTarget.id);
    setIsBusy(null);
    setDeleteTarget(null);

    if (error) {
      showToast("Something went wrong. Please try again.", "error");
      return;
    }

    setSimulations((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    showToast("Simulation deleted", "success");
    router.refresh();
  };

  if (simulations.length === 0) {
    return (
      <div className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl text-center min-h-[280px]">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-md">
          <MaterialIcon name="model_training" className="text-stitch-primary text-4xl" />
        </div>
        <h3 className="font-headline-md text-headline-md text-stitch-primary mb-1">My Simulations</h3>
        <p className="text-on-surface-variant font-body-md max-w-xs mb-lg">
          Your library is currently empty. Design your first pitch scenario.
        </p>
        <Link
          href="/teacher/simulation/new"
          className="px-lg h-10 bg-primary-container text-white font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
        >
          <MaterialIcon name="bolt" className="text-[20px]" />
          Create Simulation
        </Link>
      </div>
    );
  }

  return (
    <>
      {deleteTarget && (
        <ConfirmModal
          title="Delete simulation?"
          message="Are you sure you want to delete this simulation? This cannot be undone."
          confirmLabel="Delete"
          isDestructive
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Title
              </th>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Persona
              </th>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Students Attempted
              </th>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-lg py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {simulations.map((sim) => (
              <tr key={sim.id} className="hover:bg-secondary-fixed/10 transition-colors">
                <td className="px-lg py-md">
                  <div className="flex flex-col">
                    <span className="font-bold text-stitch-primary">{sim.title}</span>
                    {sim.description && (
                      <span className="text-label-sm text-on-surface-variant line-clamp-1">{sim.description}</span>
                    )}
                  </div>
                </td>
                <td className="px-lg py-md text-body-md">{sim.persona_name}</td>
                <td className="px-lg py-md">
                  <span
                    className={`px-2 py-0.5 font-bold text-[10px] uppercase rounded ${
                      sim.is_published
                        ? "bg-tertiary-fixed text-on-surface"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {sim.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-lg py-md text-body-md text-on-surface-variant">—</td>
                <td className="px-lg py-md">
                  <span className="text-on-surface-variant">—</span>
                </td>
                <td className="px-lg py-md text-right">
                  <div className="flex items-center justify-end gap-2 text-on-surface-variant">
                    <Link
                      href={`/teacher/simulation/${sim.id}/edit`}
                      className="p-2 hover:bg-surface-container hover:text-stitch-primary rounded"
                      title="Edit"
                    >
                      <MaterialIcon name="edit" className="text-[20px]" />
                    </Link>
                    <Link
                      href={`/teacher/simulation/${sim.id}/results`}
                      className="p-2 hover:bg-surface-container hover:text-stitch-primary rounded"
                      title="Results"
                    >
                      <MaterialIcon name="bar_chart" className="text-[20px]" />
                    </Link>
                    <button
                      type="button"
                      disabled={isBusy === sim.id}
                      onClick={() => void handleTogglePublish(sim)}
                      className="p-2 hover:bg-surface-container hover:text-stitch-primary rounded disabled:opacity-50"
                      title={sim.is_published ? "Unpublish" : "Publish"}
                    >
                      <MaterialIcon
                        name={sim.is_published ? "toggle_on" : "toggle_off"}
                        className="text-[20px]"
                      />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy === sim.id}
                      onClick={() => setDeleteTarget(sim)}
                      className="p-2 hover:bg-error-container hover:text-error rounded disabled:opacity-50"
                      title="Delete"
                    >
                      <MaterialIcon name="delete" className="text-[20px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
