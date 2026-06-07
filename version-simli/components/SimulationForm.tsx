/**
 * SimulationForm.tsx
 * Two-column create / edit simulation form for teachers (Stitch layout).
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/shared/Sidebar";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import type { Simulation } from "@/types";

type SimulationFormProps = {
  teacherId: string;
  initial?: Simulation;
  professorName?: string;
};

/**
 * Teacher form to save a simulation draft.
 */
export function SimulationForm({
  teacherId,
  initial,
  professorName = "Professor",
}: SimulationFormProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [personaName, setPersonaName] = useState(initial?.persona_name ?? "");
  const [personaRole, setPersonaRole] = useState(initial?.persona_role ?? "");
  const [personaPrompt, setPersonaPrompt] = useState(initial?.persona_system_prompt ?? "");
  const [simliFaceId, setSimliFaceId] = useState(initial?.simli_face_id ?? "");
  const [productContext, setProductContext] = useState(initial?.product_context ?? "");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markDirty = (): void => {
    setHasUnsavedChanges(true);
  };

  const handleSave = async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    if (!title || !personaName || !personaRole || !personaPrompt || !productContext || !simliFaceId) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    const payload = {
      teacher_id: teacherId,
      title,
      description: description || null,
      persona_name: personaName,
      persona_role: personaRole,
      persona_system_prompt: personaPrompt,
      product_context: productContext,
      simli_face_id: simliFaceId,
      is_published: initial?.is_published ?? false,
    };

    const supabase = createClient();

    if (initial) {
      const { error: updateError } = await supabase
        .from("simulations")
        .update(payload)
        .eq("id", initial.id);
      if (updateError) {
        setError(updateError.message);
        showToast("Something went wrong. Please try again.", "error");
        setIsLoading(false);
        return;
      }
      showToast("Simulation saved successfully", "success");
      setHasUnsavedChanges(false);
      router.push(`/teacher/simulation/${initial.id}/edit`);
    } else {
      const { data, error: insertError } = await supabase
        .from("simulations")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) {
        setError(insertError.message);
        showToast("Something went wrong. Please try again.", "error");
        setIsLoading(false);
        return;
      }
      showToast("Simulation saved successfully", "success");
      setHasUnsavedChanges(false);
      router.push(`/teacher/simulation/${data.id}/edit`);
    }
    router.refresh();
    setIsLoading(false);
  };

  const previewTitle = title || "Untitled Simulation";
  const previewProduct =
    productContext.trim().split(/[\n.]/)[0]?.slice(0, 40) || "Product context";

  return (
    <>
      <header className="bg-surface sticky top-0 z-50 border-b border-outline-variant">
        <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <MaterialIcon name="arrow_back" className="text-stitch-primary" />
            </Link>
            <div className="flex flex-col">
              <h1 className="font-headline-lg text-headline-lg font-bold text-stitch-primary">
                {initial ? "Edit Simulation" : "Create Simulation"}
              </h1>
              <span className="font-label-sm text-label-sm text-on-surface-variant">PitchLab Professor Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="font-label-md text-label-md text-on-surface">{professorName}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Professor</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container-low flex items-center justify-center font-bold text-stitch-primary">
              {professorName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-margin-desktop py-lg pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-gutter items-start">
          {/* ── Form column ─── */}
          <div className="lg:col-span-6 flex flex-col gap-lg">
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
              <div className="flex items-center gap-2 mb-md">
                <MaterialIcon name="info" className="text-primary-container" />
                <h2 className="font-headline-md text-headline-md text-stitch-primary">Basic Info</h2>
              </div>
              <div className="flex flex-col gap-md">
                <div className="flex flex-col gap-xs">
                  <label htmlFor="sim-title" className="font-label-md text-label-md text-on-surface-variant">
                    Simulation Title
                  </label>
                  <input
                    id="sim-title"
                    placeholder="e.g., Enterprise SaaS Series A Pitch"
                    className="professor-input h-10"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label htmlFor="sim-description" className="font-label-md text-label-md text-on-surface-variant">
                    Description
                  </label>
                  <textarea
                    id="sim-description"
                    placeholder="Describe the learning objectives and the context for the students."
                    className="professor-input resize-none"
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-outline-variant/30" />

            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
              <div className="flex items-center gap-2 mb-md">
                <MaterialIcon name="person_apron" className="text-primary-container" />
                <h2 className="font-headline-md text-headline-md text-stitch-primary">Persona</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
                <div className="flex flex-col gap-xs">
                  <label htmlFor="persona-name" className="font-label-md text-label-md text-on-surface-variant">
                    Persona Name
                  </label>
                  <input
                    id="persona-name"
                    className="professor-input h-10"
                    value={personaName}
                    onChange={(e) => {
                      setPersonaName(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label htmlFor="persona-role" className="font-label-md text-label-md text-on-surface-variant">
                    Role
                  </label>
                  <input
                    id="persona-role"
                    className="professor-input h-10"
                    value={personaRole}
                    onChange={(e) => {
                      setPersonaRole(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-xs mb-md">
                <label htmlFor="persona-prompt" className="font-label-md text-label-md text-on-surface-variant">
                  System Prompt
                </label>
                <textarea
                  id="persona-prompt"
                  className="professor-input font-mono text-code-md bg-surface-container-low resize-none"
                  rows={6}
                  value={personaPrompt}
                  onChange={(e) => {
                    setPersonaPrompt(e.target.value);
                    markDirty();
                  }}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label htmlFor="simli-face" className="font-label-md text-label-md text-on-surface-variant">
                  Simli Face ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="simli-face"
                    className="professor-input font-mono flex-1 h-10"
                    value={simliFaceId}
                    onChange={(e) => {
                      setSimliFaceId(e.target.value);
                      markDirty();
                    }}
                  />
                  <button
                    type="button"
                    className="h-10 px-md border border-outline-variant hover:bg-surface-container-high transition-colors font-label-md rounded-lg flex items-center gap-2 shrink-0"
                  >
                    <MaterialIcon name="face" className="text-[18px]" />
                    Preview Face
                  </button>
                </div>
              </div>
            </section>

            <div className="h-px bg-outline-variant/30" />

            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
              <div className="flex items-center gap-2 mb-md">
                <MaterialIcon name="lightbulb" className="text-primary-container" />
                <h2 className="font-headline-md text-headline-md text-stitch-primary">Scenario</h2>
              </div>
              <div className="flex flex-col gap-md">
                <div className="flex flex-col gap-xs">
                  <label htmlFor="product-context" className="font-label-md text-label-md text-on-surface-variant">
                    Product Context
                  </label>
                  <textarea
                    id="product-context"
                    placeholder="What the student is selling — context and constraints for the scenario."
                    className="professor-input resize-none min-h-[160px]"
                    rows={6}
                    value={productContext}
                    onChange={(e) => {
                      setProductContext(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </section>

            {error && (
              <p className="text-sm text-error border border-error/30 bg-error-container rounded-md p-3">{error}</p>
            )}
          </div>

          {/* ── Preview column ─── */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="flex flex-col gap-md">
              <div className="flex items-center justify-between">
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Student Preview
                </h3>
                <span className="flex items-center gap-1 text-secondary font-label-sm">
                  <MaterialIcon name="visibility" className="text-[14px]" />
                  {initial?.is_published ? "Live" : "Draft"}
                </span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-md flex flex-col">
                <div className="h-48 bg-primary-container relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-container/90 to-primary-container/40" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-surface-container-highest flex items-center justify-center text-stitch-primary font-bold text-lg">
                      {personaName.slice(0, 1).toUpperCase() || "?"}
                    </div>
                    <div className="text-white">
                      <p className="font-bold text-headline-md">{personaName || "Persona name"}</p>
                      <p className="font-label-sm opacity-80">{personaRole || "Role"}</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <span className="font-label-sm text-white">10 Min Session</span>
                  </div>
                </div>
                <div className="p-lg flex flex-col gap-md">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-stitch-primary">{previewTitle}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <MaterialIcon name="business_center" className="text-secondary text-[16px]" />
                      <span className="font-label-sm text-on-surface-variant">{previewProduct}</span>
                    </div>
                  </div>
                  <p className="text-body-md text-on-surface-variant line-clamp-3">
                    {productContext || "Product context will appear here as you type."}
                  </p>
                  <button
                    type="button"
                    disabled
                    className="w-full h-12 bg-primary-container text-white rounded-lg font-bold opacity-80 flex items-center justify-center gap-2 cursor-default"
                  >
                    Start Simulation
                    <MaterialIcon name="play_arrow" />
                  </button>
                </div>
              </div>
              <div className="bg-secondary-container/10 border border-secondary-container/20 rounded-lg p-md">
                <div className="flex items-start gap-3">
                  <MaterialIcon name="tips_and_updates" className="text-secondary shrink-0" />
                  <div>
                    <h5 className="font-label-md text-secondary font-bold">Pro-Tip</h5>
                    <p className="text-body-md text-on-surface-variant">
                      Use specific System Prompts to trigger different student behaviors. For example: &quot;Be
                      extremely aggressive on pricing questions.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant z-40">
        <div className="max-w-container-max mx-auto px-margin-desktop py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container text-error rounded-full animate-pulse shrink-0">
                <MaterialIcon name="warning" className="text-[14px]" />
                <span className="font-label-sm">Unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleSave()}
              className="px-lg h-10 border border-outline-variant text-stitch-primary font-bold rounded-lg hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleSave()}
              className="px-lg h-10 bg-primary-container text-white font-bold rounded-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
