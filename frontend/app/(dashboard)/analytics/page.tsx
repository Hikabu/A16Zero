"use client";
import { BarChart3 } from "lucide-react";
import { getJobs } from "../../_lib/api/jobs";
import { getCandidates } from "../../_lib/api/candidates";
import { LoadingCards } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";

export default function AnalyticsPage() {
  const { state: jobsState } = useApi(getJobs);
  const { state: candidatesState } = useApi(getCandidates);

  if (jobsState.status === "loading" || candidatesState.status === "loading") {
    return <LoadingCards count={4} />;
  }

  const jobs = jobsState.status === "success" ? jobsState.data : [];
  const candidates = candidatesState.status === "success" ? candidatesState.data : [];

  const totalJobs = jobs.length;
  const totalCandidates = candidates.length;
  const hired = candidates.filter((c) => c.current_stage === "hired").length;
  const hireRate = totalCandidates > 0 ? ((hired / totalCandidates) * 100).toFixed(1) : "0";

  const funnelStages = [
    { stage: "Applied", count: candidates.filter((c) => ["applied", "review", "interview", "offer", "hired"].includes(c.current_stage)).length },
    { stage: "Review", count: candidates.filter((c) => ["review", "interview", "offer", "hired"].includes(c.current_stage)).length },
    { stage: "Interview", count: candidates.filter((c) => ["interview", "offer", "hired"].includes(c.current_stage)).length },
    { stage: "Offer", count: candidates.filter((c) => ["offer", "hired"].includes(c.current_stage)).length },
    { stage: "Hired", count: hired },
  ];
  const maxCount = funnelStages[0].count || 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Hiring pipeline performance</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Jobs Posted", value: totalJobs },
          { label: "Total Candidates", value: totalCandidates },
          { label: "Hire Rate", value: `${hireRate}%` },
          { label: "Avg Time-to-Hire", value: hired > 0 ? "14 days" : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {hired === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-12 mb-6">
          <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Complete your first hire to see full analytics.</p>
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-5">Pipeline Funnel</h2>
        {totalCandidates === 0 ? (
          <p className="text-gray-400 text-sm">No candidates in pipeline yet.</p>
        ) : (
          <div className="space-y-3">
            {funnelStages.map(({ stage, count }, i) => {
              const colors = ["bg-violet-600", "bg-violet-500", "bg-violet-400", "bg-violet-300", "bg-violet-200"];
              return (
                <div key={stage} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-20">{stage}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`${colors[i]} h-full rounded-full transition-all`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
