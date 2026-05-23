/**
 * PipelineProgress.tsx
 * Full-width 2×3 chevron pipeline for the student simulation flow (Stitch design).
 */

"use client";

import type { StageProgressItem } from "@/types";

type PipelineProgressProps = {
  items: StageProgressItem[];
  /** When true, all stages render as complete (e.g. results page). */
  allComplete?: boolean;
};

/**
 * Chevron clip variant by column so left/right stage text is not cut off.
 */
function chevronColumnClass(index: number): string {
  const col = index % 3;
  if (col === 0) return "pipeline-chevron-first";
  if (col === 2) return "pipeline-chevron-last";
  return "pipeline-chevron-mid";
}

/**
 * Horizontal padding — extra inset so labels sit right of the chevron notch.
 */
function cardPaddingClass(index: number): string {
  const col = index % 3;
  if (col === 0) return "pl-5 pr-6 sm:pl-6 sm:pr-8";
  if (col === 2) return "pl-8 pr-5 sm:pl-10 sm:pr-6";
  return "pl-8 pr-6 sm:pl-10 sm:pr-8";
}

/**
 * Returns Tailwind classes for a pipeline card by status.
 */
function cardClasses(
  status: StageProgressItem["status"],
  allComplete: boolean,
  index: number
): string {
  const effective = allComplete ? "completed" : status;
  const base = `relative flex flex-col justify-center min-h-[72px] py-3 text-left transition-colors ${chevronColumnClass(index)} ${cardPaddingClass(index)}`;

  if (effective === "completed") {
    return `${base} bg-gold/15 border border-gold/40 text-primary`;
  }
  if (effective === "current") {
    return `${base} bg-accent/15 border border-accent/50 text-primary ring-2 ring-accent/30`;
  }
  return `${base} bg-surface border border-border text-text-secondary`;
}

/**
 * Chevron-style stage pipeline in a 2×3 grid with gold / blue / grey states.
 */
export function PipelineProgress({
  items,
  allComplete = false,
}: PipelineProgressProps): React.ReactElement {
  return (
    <div className="w-full mb-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3 pl-1">
        Simulation pipeline
      </p>
      <div className="overflow-x-auto pb-1 -mr-4 pr-4 sm:mr-0 sm:pr-0">
        <div className="grid grid-cols-3 gap-1.5 min-w-[min(100%,640px)] w-full max-w-full ml-2 sm:ml-4 md:ml-6">
          {items.map((item, index) => (
            <div
              key={item.stage}
              className={cardClasses(item.status, allComplete, index)}
              aria-current={!allComplete && item.status === "current" ? "step" : undefined}
            >
              <span className="text-[10px] uppercase tracking-wide text-text-secondary block">
                Stage {index + 1}
              </span>
              <span className="text-sm font-semibold text-text-primary leading-tight mt-0.5 block">
                {item.label}
              </span>
              {(item.score !== undefined || allComplete) && item.score !== undefined && (
                <span className="text-xs font-medium text-gold mt-1 block">{item.score}/100</span>
              )}
              {!allComplete && item.status === "current" && item.score === undefined && (
                <span className="text-xs text-accent mt-1 font-medium block">In progress</span>
              )}
              {!allComplete && item.status === "locked" && (
                <span className="text-xs text-pipeline-inactive mt-1 block">Not started</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
