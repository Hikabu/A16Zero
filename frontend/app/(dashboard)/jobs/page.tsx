"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Briefcase } from "lucide-react";
import { getJobs } from "../../_lib/api/jobs";
import { BondBadge } from "../../_components/BondBadge";
import { LoadingTable, ErrorState } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";
import { JobStatus } from "../../_lib/types";

const STATUS_LABELS: Record<JobStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-500" },
};

export default function JobsPage() {
  const { state, reload } = useApi(getJobs);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  if (state.status === "loading") return <LoadingTable />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;

  const jobs = state.data;
  const departments = Array.from(new Set(jobs.map((j) => j.department)));
  const filtered = jobs.filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (deptFilter !== "all" && j.department !== deptFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">{jobs.length} total jobs</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
          <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No jobs match your filters.</p>
          <Link href="/jobs/new" className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-500 transition-colors">
            Post your first role
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Job Title</span>
            <span>Status</span>
            <span>Applicants</span>
            <span>Bond</span>
            <span>Location</span>
            <span />
          </div>
          {filtered.map((job) => {
            const { label, className } = STATUS_LABELS[job.status];
            const isFull = job.applicant_count >= 100;
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.department}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                  {label}
                </span>
                <span className={`text-sm ${isFull ? "text-red-600 font-medium" : "text-gray-600"}`}>
                  {isFull ? `Full (${job.applicant_count}/100)` : `${job.applicant_count}/100`}
                </span>
                <BondBadge status={job.bond_status} />
                <span className="text-sm text-gray-500 capitalize">{job.location_type}</span>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
