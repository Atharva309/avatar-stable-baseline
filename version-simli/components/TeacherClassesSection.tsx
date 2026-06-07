/**
 * TeacherClassesSection.tsx
 * Professor dashboard — list classes, create class modal, copy join links.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/shared/Sidebar";
import { useToast } from "@/hooks/useToast";
import { STUDENT_JOIN_PATH } from "@/lib/constants";
import type { Class } from "@/types";

type ClassWithCounts = Class & {
  student_count: number;
  simulation_count: number;
};

/**
 * Interactive classes section for the teacher dashboard.
 */
export function TeacherClassesSection(): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadClasses = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/professor/classes");
    if (!res.ok) {
      setIsLoading(false);
      return;
    }
    const body = (await res.json()) as { classes: ClassWithCounts[] };
    setClasses(body.classes ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const copyToClipboard = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, "success");
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsCreating(true);
    const res = await fetch("/api/professor/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setIsCreating(false);

    if (!res.ok) {
      showToast("Could not create class", "error");
      return;
    }

    setShowModal(false);
    setName("");
    setDescription("");
    showToast("Class created", "success");
    await loadClasses();
    router.refresh();
  };

  const joinUrl = (): string => {
    if (typeof window === "undefined") {
      return STUDENT_JOIN_PATH;
    }
    return `${window.location.origin}${STUDENT_JOIN_PATH}`;
  };

  return (
    <section className="space-y-lg">
      <div className="flex items-center justify-between border-b border-outline-variant pb-md gap-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="school" className="text-stitch-primary text-[24px]" />
          <h2 className="font-headline-md text-headline-md text-stitch-primary">My Classes</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-md py-2.5 bg-primary-container text-white rounded-lg hover:opacity-90 transition-all font-label-md active:scale-95 shrink-0"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          Create New Class
        </button>
      </div>

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant py-8 text-center">Loading classes…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {classes.map((classRow) => (
            <div
              key={classRow.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="p-md flex flex-col h-full">
                <div className="flex justify-between items-start mb-base">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded">
                    Active
                  </span>
                  <button type="button" className="text-on-surface-variant hover:text-stitch-primary transition-colors">
                    <MaterialIcon name="more_vert" className="text-[20px]" />
                  </button>
                </div>
                <h3 className="font-headline-md text-headline-md text-stitch-primary mb-xs">{classRow.name}</h3>
                {classRow.description && (
                  <p className="text-body-md text-on-surface-variant mb-lg line-clamp-2">{classRow.description}</p>
                )}
                {!classRow.description && <div className="mb-lg" />}
                <div className="flex gap-4 mb-lg">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <MaterialIcon name="group" className="text-[18px]" />
                    <span className="text-label-sm font-medium">
                      {classRow.student_count} Student{classRow.student_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <MaterialIcon name="rocket_launch" className="text-[18px]" />
                    <span className="text-label-sm font-medium">
                      {classRow.simulation_count} Simulation{classRow.simulation_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="mt-auto space-y-md">
                  <div className="bg-surface-container-low p-md rounded-lg flex items-center justify-between border border-dashed border-outline">
                    <code className="font-code-lg text-code-lg text-stitch-primary tracking-widest">
                      {classRow.join_code}
                    </code>
                    <button
                      type="button"
                      aria-label="Copy join code"
                      onClick={() => void copyToClipboard(classRow.join_code, "Join code")}
                      className="flex items-center gap-1 text-secondary hover:text-on-secondary-fixed-variant transition-colors font-label-sm"
                    >
                      <MaterialIcon name="content_copy" className="text-[18px]" />
                      Copy
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(joinUrl(), "Join link")}
                      className="flex-1 py-2 text-center border border-outline text-stitch-primary font-label-md rounded hover:bg-surface-container-high transition-colors"
                    >
                      Copy Join Link
                    </button>
                    <Link
                      href={`/teacher/classes/${classRow.id}`}
                      className="flex-1 py-2 text-center bg-stitch-primary text-white font-label-md rounded flex items-center justify-center gap-1 hover:opacity-90"
                    >
                      Manage Class
                      <MaterialIcon name="arrow_forward" className="text-[16px]" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state / add cohort card */}
          {classes.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center text-center space-y-md min-h-[320px] shadow-sm empty-state-gradient md:col-span-2 lg:col-span-3">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-2">
                <MaterialIcon name="school" className="text-stitch-primary text-4xl" />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-stitch-primary mb-1">My Classes</h3>
                <p className="text-on-surface-variant font-body-md text-body-md max-w-xs mx-auto">
                  You haven&apos;t organized any teaching cohorts yet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-lg h-10 bg-primary-container text-white font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                <MaterialIcon name="add_circle" className="text-[20px]" />
                Create Class
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl text-center hover:bg-surface-container-high transition-colors cursor-pointer group min-h-[280px]"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-md group-hover:scale-110 transition-transform">
                <MaterialIcon name="add_box" className="text-[32px] text-stitch-primary" />
              </div>
              <p className="font-headline-md text-headline-md text-stitch-primary">Add a Cohort</p>
              <p className="text-on-surface-variant text-body-md max-w-[200px] mt-1">
                Create a new section to start tracking simulation performance.
              </p>
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center professor-modal-overlay px-4">
          <div className="bg-surface-container-lowest w-full max-w-[560px] rounded-xl shadow-xl border border-outline-variant overflow-hidden">
            <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md text-stitch-primary">Create New Class</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-stitch-primary transition-colors"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreate(e)} className="p-xl space-y-lg">
              <div className="space-y-sm">
                <label htmlFor="className" className="block font-label-md text-label-md text-on-surface-variant">
                  Class Name <span className="text-error">*</span>
                </label>
                <input
                  id="className"
                  type="text"
                  required
                  placeholder="e.g. Advanced AI - Fall 2024"
                  className="professor-input h-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-sm">
                <label htmlFor="classDescription" className="block font-label-md text-label-md text-on-surface-variant">
                  Description
                </label>
                <textarea
                  id="classDescription"
                  placeholder="Briefly describe the course objectives and requirements..."
                  className="professor-input resize-none min-h-[100px] py-md"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="bg-secondary-fixed/20 border border-secondary-fixed/30 p-md rounded-lg flex gap-md items-start">
                <MaterialIcon name="info" className="text-secondary shrink-0" />
                <p className="font-body-md text-body-md text-on-surface-variant">
                  A unique 6-character join code will be generated automatically upon creation. Students can use
                  this code to enroll in your class instantly.
                </p>
              </div>
              <div className="pt-lg flex justify-end items-center gap-md">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-lg h-10 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-lg h-10 rounded-lg bg-primary-container text-white font-bold font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isCreating ? "Creating…" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
