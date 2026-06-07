/**
 * TeacherResultsClient.tsx
 * Expandable attempt rows and leaderboard tab (Stitch table styling).
 */

"use client";

import { Fragment, useState } from "react";
import { MaterialIcon } from "@/components/shared/Sidebar";
import { TeacherLeaderboard } from "@/components/TeacherLeaderboard";
import { STAGE_LABELS, SCORED_STAGES } from "@/lib/constants";
import { scoreToGrade } from "@/lib/grades";
import { stageScoreTone, toneTextClass } from "@/lib/score-display";
import type { LeaderboardEntry, StageScore } from "@/types";

type AttemptRow = {
  id: string;
  student_id: string;
  total_score: number;
  status: string;
  started_at: string;
  profiles?: { full_name: string } | null;
  students?: { display_name: string } | { display_name: string }[] | null;
  stage_scores: StageScore[];
};

function resolveAttemptStudentName(row: AttemptRow): string {
  const student = Array.isArray(row.students) ? row.students[0] : row.students;
  if (student?.display_name?.trim()) {
    return student.display_name.trim();
  }
  return row.profiles?.full_name ?? "—";
}

function studentInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function gradeCircleClass(grade: string): string {
  if (grade.startsWith("A")) return "bg-tertiary-fixed text-on-surface";
  if (grade.startsWith("B")) return "bg-secondary-fixed text-on-surface";
  return "bg-surface-container text-on-surface-variant";
}

function statusBadgeClass(status: string): string {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-yellow-100 text-yellow-700";
  return "bg-surface-container-high text-on-surface-variant";
}

function formatStatusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  return status.replace("_", " ");
}

type TeacherResultsClientProps = {
  attempts: AttemptRow[];
  leaderboard: LeaderboardEntry[];
  stageScoresByAttempt: Record<string, StageScore[]>;
  simulationTitle: string;
  simulationSubtitle?: string;
};

/**
 * Teacher results table with expandable stage detail and leaderboard tab.
 */
export function TeacherResultsClient({
  attempts,
  leaderboard,
  stageScoresByAttempt,
  simulationTitle,
  simulationSubtitle,
}: TeacherResultsClientProps): React.ReactElement {
  const [tab, setTab] = useState<"attempts" | "leaderboard">("attempts");
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleDetails = (rowId: string): void => {
    setExpanded((current) => (current === rowId ? null : rowId));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex justify-between items-center w-full px-margin-desktop py-4 bg-surface border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <a
            href="/teacher/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
          >
            <MaterialIcon name="arrow_back" className="text-on-surface" />
          </a>
          <div className="min-w-0">
            <h2 className="font-headline-md text-headline-md text-stitch-primary truncate">{simulationTitle}</h2>
            {simulationSubtitle && (
              <p className="font-body-md text-body-md text-on-surface-variant truncate">{simulationSubtitle}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-margin-desktop bg-surface-bright">
        <div className="flex items-center border-b border-outline-variant mb-lg">
          <button
            type="button"
            onClick={() => setTab("attempts")}
            className={`px-6 py-3 font-label-md text-label-md transition-all ${
              tab === "attempts"
                ? "text-stitch-primary font-bold border-b-2 border-stitch-primary"
                : "text-on-surface-variant hover:text-stitch-primary"
            }`}
          >
            Student Attempts
          </button>
          <button
            type="button"
            onClick={() => setTab("leaderboard")}
            className={`px-6 py-3 font-label-md text-label-md transition-all ${
              tab === "leaderboard"
                ? "text-stitch-primary font-bold border-b-2 border-stitch-primary"
                : "text-on-surface-variant hover:text-stitch-primary"
            }`}
          >
            Leaderboard
          </button>
        </div>

        {tab === "leaderboard" ? (
          <TeacherLeaderboard
            entries={leaderboard}
            stageScoresByAttempt={stageScoresByAttempt}
            emptyMessage="No students have completed this simulation yet."
          />
        ) : attempts.length === 0 ? (
          <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low/30">
            <div className="max-w-md w-full p-xl text-center space-y-lg">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto">
                  <MaterialIcon name="bar_chart_off" className="text-stitch-primary text-5xl" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-md border border-outline-variant">
                  <MaterialIcon name="pending" className="text-error text-xl" />
                </div>
              </div>
              <div className="space-y-sm">
                <h2 className="font-headline-lg text-headline-lg text-stitch-primary">No attempts yet</h2>
                <p className="text-on-surface-variant font-body-lg">
                  The simulation results will populate here once students begin submitting their pitches and AI
                  analysis is complete.
                </p>
              </div>
              <div className="flex items-center justify-center gap-1 text-on-surface-variant">
                <MaterialIcon name="info" className="text-[16px]" />
                <span className="font-label-sm italic">Standard processing time is 5–10 minutes per submission.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Date Submitted
                  </th>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {attempts.map((row) => {
                  const studentName = resolveAttemptStudentName(row);
                  const grade = row.status === "completed" ? scoreToGrade(row.total_score) : "—";
                  const isExpanded = expanded === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="hover:bg-secondary-fixed/10 transition-colors cursor-pointer group"
                        onClick={() => toggleDetails(row.id)}
                      >
                        <td className="px-md py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stitch-primary/5 flex items-center justify-center text-stitch-primary font-bold text-xs">
                              {studentInitials(studentName)}
                            </div>
                            <span className="font-body-md text-body-md">{studentName}</span>
                          </div>
                        </td>
                        <td className="px-md py-4 font-body-md text-on-surface-variant">
                          {new Date(row.started_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" · "}
                          {new Date(row.started_at).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-md py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md font-label-sm text-label-sm capitalize ${statusBadgeClass(row.status)}`}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-md py-4 font-code-md text-code-md">
                          {row.status === "completed" ? `${row.total_score}/600` : "—"}
                        </td>
                        <td className="px-md py-4">
                          {row.status === "completed" ? (
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${gradeCircleClass(grade)}`}
                            >
                              {grade}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-container text-on-surface-variant font-bold text-sm">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-md py-4 text-right">
                          <button
                            type="button"
                            className="text-secondary font-label-md hover:underline flex items-center gap-1 ml-auto"
                          >
                            View Details
                            <MaterialIcon
                              name="expand_more"
                              className={`text-[18px] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                      </tr>
                      <tr className={`expanding-row-content bg-surface-container-low/30 ${isExpanded ? "active" : ""}`}>
                        <td className="px-xl py-lg" colSpan={6}>
                          {row.status !== "completed" ? (
                            <p className="text-center font-body-md text-on-surface-variant italic">
                              {row.status === "in_progress"
                                ? "Student is still interacting with the simulation."
                                : "Detailed analysis will appear when the attempt is completed."}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                              <div className="space-y-md">
                                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase">
                                  Per-Stage Scoring
                                </h4>
                                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                                  <table className="w-full">
                                    <tbody>
                                      {SCORED_STAGES.map((stage) => {
                                        const sc = row.stage_scores.find((s) => s.stage === stage);
                                        const tone = sc ? stageScoreTone(sc.score) : null;
                                        return (
                                          <tr key={stage} className="border-b border-outline-variant last:border-0">
                                            <td className="p-3 font-body-md text-body-md">{STAGE_LABELS[stage]}</td>
                                            <td className={`p-3 font-code-md text-code-md text-right ${sc ? toneTextClass(tone!) : ""}`}>
                                              {sc ? `${sc.score}/100` : "—"}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div className="space-y-md">
                                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase">
                                  Stage Feedback
                                </h4>
                                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 h-48 overflow-y-auto custom-scrollbar space-y-3">
                                  {SCORED_STAGES.map((stage) => {
                                    const sc = row.stage_scores.find((s) => s.stage === stage);
                                    if (!sc?.feedback) return null;
                                    return (
                                      <div key={stage} className="flex flex-col gap-1">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                                          {STAGE_LABELS[stage]}:
                                        </span>
                                        <p className="font-body-md text-body-md text-on-surface">{sc.feedback}</p>
                                      </div>
                                    );
                                  })}
                                  {!row.stage_scores.some((s) => s.feedback) && (
                                    <p className="text-on-surface-variant italic text-body-md">No feedback recorded.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
