/**
 * ClassManagementClient.tsx
 * Class detail page — manage students list and simulation assignments.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/shared/Sidebar";
import { useToast } from "@/hooks/useToast";
import { STUDENT_JOIN_PATH } from "@/lib/constants";
import type { Simulation, Student } from "@/types";

type AssignedSimulation = {
  id: string;
  simulation_id: string;
  added_at: string;
  simulations: Simulation | Simulation[] | null;
};

type ClassManagementClientProps = {
  classId: string;
  joinCode: string;
  initialStudents: Pick<Student, "id" | "username" | "display_name" | "joined_at">[];
  initialAssignments: AssignedSimulation[];
  professorSimulations: Simulation[];
};

const SIM_ICONS = ["trending_up", "forum", "handshake"] as const;
const SIM_ICON_BG = ["bg-primary-container", "bg-secondary-container", "bg-surface-container-highest"] as const;

/**
 * Client UI for assigning simulations and viewing enrolled students.
 */
export function ClassManagementClient({
  classId,
  joinCode,
  initialStudents,
  initialAssignments,
  professorSimulations,
}: ClassManagementClientProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedSimId, setSelectedSimId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [copiedField, setCopiedField] = useState<"link" | "code" | null>(null);

  const assignedIds = new Set(assignments.map((a) => a.simulation_id));
  const availableSims = professorSimulations.filter((s) => !assignedIds.has(s.id));

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${STUDENT_JOIN_PATH}`
      : STUDENT_JOIN_PATH;

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopiedField("code");
      setTimeout(() => setCopiedField(null), 2000);
      showToast("Class code copied", "success");
    } catch {
      showToast("Could not copy code", "error");
    }
  };

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedField("link");
      setTimeout(() => setCopiedField(null), 2000);
      showToast("Join link copied", "success");
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const resolveSim = (row: AssignedSimulation): Simulation | null => {
    const sim = row.simulations;
    return Array.isArray(sim) ? sim[0] ?? null : sim;
  };

  const handleAdd = async (): Promise<void> => {
    if (!selectedSimId) return;
    setIsBusy(true);
    const res = await fetch(`/api/professor/classes/${classId}/simulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulationId: selectedSimId }),
    });
    setIsBusy(false);

    if (!res.ok) {
      showToast("Could not assign simulation", "error");
      return;
    }

    showToast("Simulation assigned", "success");
    setSelectedSimId("");
    router.refresh();
  };

  const handleRemove = async (simulationId: string): Promise<void> => {
    setIsBusy(true);
    const res = await fetch(`/api/professor/classes/${classId}/simulations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulationId }),
    });
    setIsBusy(false);

    if (!res.ok) {
      showToast("Could not remove simulation", "error");
      return;
    }

    setAssignments((prev) => prev.filter((a) => a.simulation_id !== simulationId));
    showToast("Simulation removed", "success");
    router.refresh();
  };

  const visibleStudents = initialStudents.slice(0, 4);
  const hasMoreStudents = initialStudents.length > 4;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mt-8">
      {/* ── Left column ─── */}
      <div className="md:col-span-7 flex flex-col gap-8">
        <section className="bg-secondary-fixed/30 border border-secondary-fixed rounded-xl p-lg">
          <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
            <MaterialIcon name="share" />
            <h2 className="font-headline-md text-headline-md text-stitch-primary">Share with Students</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Join Link</label>
              <div className="flex gap-2">
                <div className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 font-code-md text-code-md flex items-center overflow-hidden">
                  <span className="truncate">{joinUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                  aria-label="Copy join link"
                >
                  <MaterialIcon name={copiedField === "link" ? "check" : "content_copy"} />
                </button>
              </div>
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Class Code</label>
              <div className="flex gap-2">
                <div className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 font-code-lg text-code-lg flex items-center justify-center tracking-[0.2em] uppercase">
                  {joinCode}
                </div>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                  aria-label="Copy class code"
                >
                  <MaterialIcon name={copiedField === "code" ? "check" : "content_copy"} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-white">
            <h2 className="font-headline-md text-headline-md text-primary-container">
              Enrolled Students ({initialStudents.length})
            </h2>
            <button type="button" className="text-on-surface-variant hover:text-stitch-primary">
              <MaterialIcon name="download" />
            </button>
          </div>
          {initialStudents.length === 0 ? (
            <div className="min-h-[320px] flex flex-col items-center justify-center p-xl text-center">
              <MaterialIcon name="group_off" className="text-outline-variant text-5xl mb-4" />
              <p className="text-headline-md font-headline-md text-on-surface-variant">No students have joined yet</p>
              <p className="text-on-surface-variant font-body-md mt-2 mb-lg">
                Share your class code with students to start tracking progress.
              </p>
              <div className="inline-flex flex-col items-center p-lg bg-surface-container-low border border-dashed border-outline rounded-lg">
                <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
                  Class Join Code
                </span>
                <code className="font-code-lg text-code-lg text-secondary select-all">{joinCode}</code>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="mt-md text-secondary font-label-sm flex items-center gap-1 hover:underline"
                >
                  <MaterialIcon name="content_copy" className="text-[16px]" />
                  Copy Code
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      <th className="px-lg py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-lg py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Display Name
                      </th>
                      <th className="px-lg py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-lg py-3 font-label-sm text-label-sm text-on-surface-variant text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {visibleStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-secondary-fixed/10 transition-colors">
                        <td className="px-lg py-4 font-body-md text-on-surface font-medium">{student.username}</td>
                        <td className="px-lg py-4 font-body-md text-on-surface-variant">{student.display_name}</td>
                        <td className="px-lg py-4 font-body-md text-on-surface-variant">
                          {new Date(student.joined_at).toLocaleDateString()}
                        </td>
                        <td className="px-lg py-4 text-right">
                          <button type="button" className="text-on-surface-variant hover:text-error">
                            <MaterialIcon name="more_vert" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreStudents && (
                <div className="p-4 text-center border-t border-outline-variant bg-surface-container-lowest">
                  <span className="font-label-md text-label-md text-secondary">
                    View All {initialStudents.length} Students
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Right column ─── */}
      <div className="md:col-span-5">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm h-fit">
          <div className="px-lg py-md border-b border-outline-variant">
            <h2 className="font-headline-md text-headline-md text-primary-container">Assigned Simulations</h2>
          </div>
          <div className="divide-y divide-outline-variant max-h-[500px] overflow-y-auto custom-scrollbar">
            {assignments.length === 0 ? (
              <p className="p-lg text-body-md text-on-surface-variant">No simulations assigned yet.</p>
            ) : (
              assignments.map((row, index) => {
                const sim = resolveSim(row);
                if (!sim) return null;
                const iconIndex = index % SIM_ICONS.length;
                return (
                  <div
                    key={row.id}
                    className="p-lg flex items-center justify-between hover:bg-surface-container-low transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg ${SIM_ICON_BG[iconIndex]} flex items-center justify-center text-white`}
                      >
                        <MaterialIcon name={SIM_ICONS[iconIndex]} />
                      </div>
                      <div>
                        <h3 className="font-label-md text-label-md text-on-surface block">{sim.title}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                            sim.is_published
                              ? "bg-tertiary-container text-on-surface"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {sim.is_published ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRemove(row.simulation_id)}
                      className="text-error font-label-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-error-container/20 px-2 py-1 rounded disabled:opacity-50"
                    >
                      <MaterialIcon name="delete" className="text-[16px]" />
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-lg bg-surface-container-low border-t border-outline-variant">
            <label htmlFor="add-simulation" className="font-label-sm text-label-sm text-on-surface-variant block mb-2">
              Add simulation...
            </label>
            <div className="flex gap-2">
              <select
                id="add-simulation"
                className="professor-input flex-1 min-w-0 py-2"
                value={selectedSimId}
                onChange={(e) => setSelectedSimId(e.target.value)}
                disabled={isBusy || availableSims.length === 0}
              >
                <option value="">Select from library</option>
                {availableSims.map((sim) => (
                  <option key={sim.id} value={sim.id}>
                    {sim.title} {sim.is_published ? "" : "(draft)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedSimId || isBusy}
                onClick={() => void handleAdd()}
                className="bg-primary-container text-white px-4 py-2 rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
