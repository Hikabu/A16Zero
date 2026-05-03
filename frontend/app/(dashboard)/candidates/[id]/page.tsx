"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { getCandidate } from "../../../_lib/api/candidates";
import { getInterviewsForCandidate } from "../../../_lib/api/interviews";
import { KYCBadge } from "../../../_components/KYCBadge";
import { ReviewTimer } from "../../../_components/ReviewTimer";
import { LoadingCards, ErrorState } from "../../../_components/PageState";
import { useApi } from "../../../_lib/useApi";

const STAGE_COLORS: Record<string, string> = {
  applied: "bg-gray-100 text-gray-600",
  review: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state: cState, reload } = useApi(() => getCandidate(id), [id]);
  const { state: iState } = useApi(() => getInterviewsForCandidate(id), [id]);

  if (cState.status === "loading") return <LoadingCards count={2} />;
  if (cState.status === "error") return <ErrorState message={cState.message} onRetry={reload} />;

  const c = cState.data;
  const interviews = iState.status === "success" ? iState.data : [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/candidates" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Candidate Profile</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg shrink-0">
            {c.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
              <KYCBadge status={c.kyc_status} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_COLORS[c.current_stage]}`}>
                {c.current_stage}
              </span>
            </div>
            <p className="text-gray-600">{c.headline}</p>
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {c.location}
            </p>
            {c.current_stage === "review" && c.review_deadline && (
              <div className="mt-3"><ReviewTimer deadline={c.review_deadline} /></div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Move Forward
            </button>
            <button className="border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              Reject
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {c.skills.map((s) => (
              <span key={s} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Experience</h3>
          <div className="space-y-3">
            {c.experience.map((e, i) => (
              <div key={i} className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.role}</p>
                  <p className="text-xs text-gray-500">{e.company}</p>
                </div>
                <p className="text-xs text-gray-400">{e.years}yr{e.years !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4">Stage History</h3>
        <div className="space-y-3">
          {c.stage_history.map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_COLORS[entry.stage]}`}>
                {entry.stage}
              </span>
              <p className="text-xs text-gray-500">
                {new Date(entry.changed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-gray-400">by {entry.changed_by}</p>
            </div>
          ))}
        </div>
      </div>

      {interviews.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Interviews</h3>
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{interview.type} Interview</p>
                  <p className="text-xs text-gray-500">
                    {new Date(interview.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  interview.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                  interview.status === "completed" ? "bg-green-100 text-green-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {interview.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
