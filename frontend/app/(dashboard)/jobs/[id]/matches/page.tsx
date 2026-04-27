"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookmarkPlus, Star } from "lucide-react";
import { getJob } from "../../../../_lib/api/jobs";
import { getJobMatches, toggleShortlist } from "../../../../_lib/api/candidates";
import { KYCBadge } from "../../../../_components/KYCBadge";
import { LoadingCards, ErrorState } from "../../../../_components/PageState";
import { useApi } from "../../../../_lib/useApi";
import { Candidate } from "../../../../_lib/types";

const TABS = ["Top Match", "Potential Match", "General Match"] as const;
type Tab = (typeof TABS)[number];

const SCORES: Record<Tab, number> = { "Top Match": 92, "Potential Match": 74, "General Match": 55 };

export default function JobMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("Top Match");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());

  const { state: jobState } = useApi(() => getJob(id), [id]);
  const { state: matchState, reload } = useApi(() => getJobMatches(id), [id]);

  async function handleShortlist(candidateId: string) {
    const next = new Set(shortlisted);
    const nowShortlisted = !next.has(candidateId);
    nowShortlisted ? next.add(candidateId) : next.delete(candidateId);
    setShortlisted(next);
    await toggleShortlist(candidateId, nowShortlisted, id).catch(() => {
      // revert on error
      const reverted = new Set(shortlisted);
      setShortlisted(reverted);
    });
  }

  if (jobState.status === "loading" || matchState.status === "loading") return <LoadingCards count={3} />;
  if (matchState.status === "error") return <ErrorState message={matchState.message} onRetry={reload} />;

  const job = jobState.status === "success" ? jobState.data : null;
  const matches = matchState.data;

  const tabCandidates: Record<Tab, Candidate[]> = {
    "Top Match": matches.top,
    "Potential Match": matches.potential,
    "General Match": matches.general,
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/jobs/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Job Matcher</h1>
          {job && <p className="text-gray-500 text-sm">{job.title}</p>}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs text-gray-400">({tabCandidates[tab].length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tabCandidates[activeTab].length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">No {activeTab.toLowerCase()} candidates yet.</p>
          </div>
        ) : (
          tabCandidates[activeTab].map((c) => {
            const score = SCORES[activeTab];
            const scoreColor = score >= 85 ? "text-green-600 bg-green-50" : score >= 65 ? "text-blue-600 bg-blue-50" : "text-gray-600 bg-gray-50";
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-5">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/candidates/${c.id}`} className="font-semibold text-gray-900 hover:text-violet-600">{c.name}</Link>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
                      <Star className="w-3 h-3" /> {score}% match
                    </span>
                    <KYCBadge status={c.kyc_status} />
                  </div>
                  <p className="text-sm text-gray-600">{c.headline}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.location}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.skills.map((s) => (
                      <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {c.experience.slice(0, 2).map((e, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {e.role} at <strong>{e.company}</strong> · {e.years}yr{e.years !== 1 ? "s" : ""}
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleShortlist(c.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    shortlisted.has(c.id) ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600"
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  {shortlisted.has(c.id) ? "Shortlisted" : "Shortlist"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
