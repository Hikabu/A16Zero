"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { getJob } from "../../../_lib/api/jobs";
import { getCandidates, moveCandidateStage } from "../../../_lib/api/candidates";
import { KYCBadge } from "../../../_components/KYCBadge";
import { ReviewTimer } from "../../../_components/ReviewTimer";
import { BondBadge } from "../../../_components/BondBadge";
import { LoadingCards, ErrorState } from "../../../_components/PageState";
import { CandidateStage, Candidate, Job } from "../../../_lib/types";

const STAGES: { id: CandidateStage; label: string }[] = [
  { id: "applied", label: "Applied" },
  { id: "review", label: "Review" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "hired", label: "Hired" },
  { id: "rejected", label: "Rejected" },
];

const STAGE_ACTIONS: Partial<Record<CandidateStage, { label: string; next: CandidateStage }[]>> = {
  applied: [{ label: "Move to Review", next: "review" }, { label: "Reject", next: "rejected" }],
  review: [{ label: "Schedule Interview", next: "interview" }, { label: "Reject", next: "rejected" }],
  interview: [{ label: "Move to Offer", next: "offer" }, { label: "Reject", next: "rejected" }],
  offer: [{ label: "Mark Hired", next: "hired" }, { label: "Reject", next: "rejected" }],
};

export default function JobPipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getJob(id), getCandidates(id)])
      .then(([j, c]) => { setJob(j); setCandidates(c); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function moveCandidate(candidateId: string, newStage: CandidateStage) {
    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, current_stage: newStage, review_deadline: newStage === "review" ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : c.review_deadline }
          : c
      )
    );
    setOpenMenu(null);
    try {
      const updated = await moveCandidateStage(candidateId, newStage);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updated : c)));
    } catch {
      load(); // revert on error
    }
  }

  if (loading) return <LoadingCards count={4} />;
  if (error || !job) return <ErrorState message={error ?? "Job not found"} onRetry={load} />;

  const byStage = (stage: CandidateStage) => candidates.filter((c) => c.current_stage === stage);
  const isFull = job.applicant_count >= 100;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/jobs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            <BondBadge status={job.bond_status} />
          </div>
          <p className="text-gray-500 text-sm">{job.department} · {job.location_type} · {job.applicant_count} applicants</p>
        </div>
        <Link href={`/jobs/${id}/matches`} className="text-sm bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">
          View Matches
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(({ id: stage, label }) => {
          const cards = byStage(stage);
          const isApplied = stage === "applied";
          const actions = STAGE_ACTIONS[stage];
          return (
            <div key={stage} className="shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isApplied && isFull ? `Full (${job.applicant_count}/100)` : label}
                  <span className="ml-2 text-gray-400">({cards.length})</span>
                </h3>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {cards.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-violet-200 transition-colors relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link href={`/candidates/${c.id}`} className="font-medium text-gray-900 text-sm hover:text-violet-600">
                          {c.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.headline}</p>
                      </div>
                      {actions && (
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)} className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          {openMenu === c.id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
                              {actions.map(({ label: actionLabel, next }) => (
                                <button
                                  key={actionLabel}
                                  onClick={() => moveCandidate(c.id, next)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${next === "rejected" ? "text-red-600" : "text-gray-700"}`}
                                >
                                  {actionLabel}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <KYCBadge status={c.kyc_status} />
                      {stage === "review" && c.review_deadline && (
                        <ReviewTimer deadline={c.review_deadline} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(c.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="border-2 border-dashed border-gray-100 rounded-xl h-24 flex items-center justify-center">
                    <p className="text-xs text-gray-300">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
