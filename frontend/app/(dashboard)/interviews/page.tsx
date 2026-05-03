"use client";
import { useState } from "react";
import { CalendarDays, Video, Phone, MapPin, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getInterviews } from "../../_lib/api/interviews";
import { LoadingCards, ErrorState } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";
import { InterviewStatus, InterviewType, Interview } from "../../_lib/types";

const TYPE_ICONS: Record<InterviewType, React.ComponentType<{ className?: string }>> = {
  video: Video,
  phone: Phone,
  "in-person": MapPin,
};

const STATUS_CONFIG: Record<InterviewStatus, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700", Icon: Clock },
  completed: { label: "Completed", className: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700", Icon: XCircle },
};

function InterviewCard({ interview }: { interview: Interview }) {
  const TypeIcon = TYPE_ICONS[interview.type];
  const { label, className, Icon: StatusIcon } = STATUS_CONFIG[interview.status];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{interview.candidate_name}</p>
          <p className="text-sm text-gray-500">{interview.job_title}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
          <StatusIcon className="w-3 h-3" /> {label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" />
          {new Date(interview.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="flex items-center gap-1.5 capitalize">
          <TypeIcon className="w-4 h-4" /> {interview.type}
        </span>
      </div>
      {interview.notes && (
        <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg p-2.5">{interview.notes}</p>
      )}
    </div>
  );
}

export default function InterviewsPage() {
  const { state, reload } = useApi(getInterviews);
  const [showForm, setShowForm] = useState(false);

  if (state.status === "loading") return <LoadingCards count={3} />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;

  const interviews = state.data;
  const sorted = [...interviews].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter((i) => i.status === "scheduled");
  const past = sorted.filter((i) => i.status !== "scheduled");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-1">{upcoming.length} upcoming, {past.length} completed</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Schedule Interview
        </button>
      </div>

      {interviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
          <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No interviews scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((i) => <InterviewCard key={i.id} interview={i} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Past</h2>
              <div className="space-y-3">
                {past.map((i) => <InterviewCard key={i.id} interview={i} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Schedule Interview</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date & Time</label>
                <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Interview Type</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="video">Video</option>
                  <option value="phone">Phone</option>
                  <option value="in-person">In-person</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Topics to cover..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-violet-500 transition-colors">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
