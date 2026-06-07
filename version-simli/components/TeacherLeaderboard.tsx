/**
 * TeacherLeaderboard.tsx
 * Leaderboard tab with export CSV and medal ranks (Stitch styling).
 */

"use client";

import { MaterialIcon } from "@/components/shared/Sidebar";
import { downloadLeaderboardCsv, type CsvExportRow } from "@/lib/export-leaderboard-csv";
import { formatRankDisplay } from "@/lib/leaderboard";
import type { LeaderboardEntry, StageScore } from "@/types";

type TeacherLeaderboardProps = {
  entries: LeaderboardEntry[];
  stageScoresByAttempt: Record<string, StageScore[]>;
  emptyMessage?: string;
};

function gradeCircleClass(grade: string): string {
  if (grade.startsWith("A")) return "bg-tertiary-fixed text-on-surface";
  if (grade.startsWith("B")) return "bg-secondary-fixed text-on-surface";
  return "bg-surface-container text-on-surface-variant";
}

function rankMedalColor(rank: number): string | null {
  if (rank === 1) return "#ffe08f";
  if (rank === 2) return "#B4B4B4";
  if (rank === 3) return "#CD7F32";
  return null;
}

/**
 * Teacher results leaderboard with CSV export.
 */
export function TeacherLeaderboard({
  entries,
  stageScoresByAttempt,
  emptyMessage = "No students have completed this simulation yet.",
}: TeacherLeaderboardProps): React.ReactElement {
  const csvRows: CsvExportRow[] = entries.map((e) => ({
    ...e,
    stage_scores: stageScoresByAttempt[e.attempt_id] ?? [],
  }));

  const handleExport = (): void => {
    downloadLeaderboardCsv(csvRows);
  };

  if (entries.length === 0) {
    return (
      <p className="text-on-surface-variant text-body-md py-8 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 bg-surface border border-outline text-on-surface font-label-md rounded-lg hover:bg-surface-container-high transition-all flex items-center gap-2"
        >
          <MaterialIcon name="download" className="text-[18px]" />
          Export CSV
        </button>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Rank
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Score
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Grade
              </th>
              <th className="px-md py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {entries.map((row) => {
              const dateLabel = row.completed_at
                ? new Date(row.completed_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              const medalColor = rankMedalColor(row.rank);
              const isTopThree = row.rank <= 3;

              return (
                <tr
                  key={row.attempt_id}
                  className={`${row.rank === 1 ? "border-l-4 border-tertiary-fixed bg-tertiary-fixed/5" : ""}`}
                >
                  <td className={`px-md ${isTopThree ? "py-5" : "py-4"}`}>
                    <div className="flex items-center gap-2">
                      {medalColor ? (
                        <MaterialIcon
                          name="workspace_premium"
                          filled
                          className="text-[24px]"
                          style={{ color: medalColor }}
                        />
                      ) : (
                        <span className="pl-[28px]" />
                      )}
                      <span
                        className={`${row.rank === 1 ? "font-code-lg text-code-lg text-stitch-primary" : "font-code-md text-code-md text-on-surface-variant"}`}
                      >
                        {formatRankDisplay(row.rank)}
                      </span>
                    </div>
                  </td>
                  <td className={`px-md ${isTopThree ? "py-5 font-headline-md text-headline-md text-stitch-primary" : "py-4 font-body-lg text-body-lg"}`}>
                    {row.student_name}
                  </td>
                  <td className={`px-md ${isTopThree ? "py-5 font-code-lg text-code-lg text-stitch-primary" : "py-4 font-code-md text-code-md"}`}>
                    {row.total_score}/600
                  </td>
                  <td className={`px-md ${isTopThree ? "py-5" : "py-4"}`}>
                    <span
                      className={`inline-flex items-center justify-center rounded-full font-bold ${
                        isTopThree ? "w-10 h-10 text-lg shadow-sm" : "w-8 h-8 text-sm"
                      } ${gradeCircleClass(row.grade)}`}
                    >
                      {row.grade}
                    </span>
                  </td>
                  <td className={`px-md font-body-md text-on-surface-variant ${isTopThree ? "py-5" : "py-4"}`}>
                    {dateLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
