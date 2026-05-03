"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { getCandidates } from "../../_lib/api/candidates";
import { KYCBadge } from "../../_components/KYCBadge";
import { ReviewTimer } from "../../_components/ReviewTimer";
import { LoadingTable, ErrorState } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";

const STAGE_COLORS: Record<string, string> = {
  applied: "bg-gray-100 text-gray-600",
  review: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

export default function CandidatesPage() {
  const { state, reload } = useApi(getCandidates);
  const [query, setQuery] = useState("");

  if (state.status === "loading") return <LoadingTable />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;

  const candidates = state.data;
  const filtered = query
    ? candidates.filter((c) => {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.headline.toLowerCase().includes(q) || c.skills.some((s) => s.toLowerCase().includes(q));
      })
    : candidates;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Global Talent Pool</h1>
        <p className="text-gray-500 text-sm mt-1">{candidates.length} candidates across all jobs</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, headline, or skill..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No candidates match your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Candidate</span><span>Job</span><span>Stage</span><span>KYC</span><span>Timer</span>
          </div>
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/candidates/${c.id}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0"
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{c.headline}</p>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{c.job_title ?? "—"}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize w-fit ${STAGE_COLORS[c.current_stage]}`}>
                {c.current_stage}
              </span>
              <KYCBadge status={c.kyc_status} />
              {c.current_stage === "review" && c.review_deadline ? (
                <ReviewTimer deadline={c.review_deadline} />
              ) : (
                <span className="text-gray-300 text-xs">—</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
