"use client";
import Link from "next/link";
import { BookmarkCheck, ArrowRight } from "lucide-react";
import { getShortlist } from "../../_lib/api/candidates";
import { KYCBadge } from "../../_components/KYCBadge";
import { LoadingCards, ErrorState } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";

export default function ShortlistPage() {
  const { state, reload } = useApi(getShortlist);

  if (state.status === "loading") return <LoadingCards count={3} />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;

  const shortlisted = state.data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Shortlist</h1>
        <p className="text-gray-500 text-sm mt-1">{shortlisted.length} high-potential candidates saved for review</p>
      </div>

      {shortlisted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
          <BookmarkCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No candidates shortlisted yet.</p>
          <Link href="/jobs" className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-500 transition-colors">
            Browse job matches
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shortlisted.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-5">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/candidates/${c.id}`} className="font-semibold text-gray-900 hover:text-violet-600">{c.name}</Link>
                  <KYCBadge status={c.kyc_status} />
                </div>
                <p className="text-sm text-gray-600">{c.headline}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.location} · Applied to {c.job_title}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.skills.map((s) => (
                    <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
                <div className="mt-3">
                  {c.experience.slice(0, 2).map((e, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      {e.role} at <strong>{e.company}</strong> · {e.years}yr{e.years !== 1 ? "s" : ""}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  c.current_stage === "review" ? "bg-blue-100 text-blue-700" :
                  c.current_stage === "interview" ? "bg-purple-100 text-purple-700" :
                  c.current_stage === "offer" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {c.current_stage}
                </span>
                <Link href={`/candidates/${c.id}`} className="flex items-center gap-1 text-xs text-violet-600 hover:underline">
                  View profile <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
