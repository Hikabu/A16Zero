"use client";
import Link from "next/link";
import { AlertTriangle, Clock, TrendingUp, Users, Briefcase, Wallet, ArrowRight, Plus } from "lucide-react";
import { getJobs } from "../../_lib/api/jobs";
import { getCandidates } from "../../_lib/api/candidates";
import { getWallet } from "../../_lib/api/finance";
import { BondBadge } from "../../_components/BondBadge";
import { LoadingCards } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";

export default function DashboardPage() {
  const { state: jobsState } = useApi(getJobs);
  const { state: candidatesState } = useApi(getCandidates);
  const { state: walletState } = useApi(getWallet);

  if (
    jobsState.status === "loading" ||
    candidatesState.status === "loading" ||
    walletState.status === "loading"
  ) {
    return <LoadingCards count={4} />;
  }

  const jobs = jobsState.status === "success" ? jobsState.data : [];
  const candidates = candidatesState.status === "success" ? candidatesState.data : [];
  const wallet = walletState.status === "success" ? walletState.data : { balance: "0", wallet_address: "—", transactions: [], bonds: [] };

  const activeJobs = jobs.filter((j) => j.status === "active");
  const totalCandidates = candidates.filter((c) => c.current_stage !== "rejected").length;
  const overdueTimers = candidates.filter(
    (c) => c.review_deadline && new Date(c.review_deadline) < new Date(),
  );
  const unfundedJobs = jobs.filter((j) => j.bond_status === "pending");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, href: "/jobs", color: "text-violet-600 bg-violet-50" },
          { label: "Candidates in Pipeline", value: totalCandidates, icon: Users, href: "/candidates", color: "text-blue-600 bg-blue-50" },
          { label: "Available Funds", value: `$${Number(wallet.balance).toLocaleString()} USDC`, icon: Wallet, href: "/finance", color: "text-green-600 bg-green-50" },
          { label: "Avg Time-to-Hire", value: "—", icon: TrendingUp, href: "/analytics", color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="bg-white rounded-xl p-5 border border-gray-100 hover:border-violet-200 transition-colors">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Urgent actions */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Urgent Actions</h2>
          {overdueTimers.length === 0 && unfundedJobs.length === 0 ? (
            <p className="text-gray-400 text-sm">No urgent actions. You&apos;re all caught up!</p>
          ) : (
            <ul className="space-y-3">
              {overdueTimers.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.name} — 48h review timer expired</p>
                    <p className="text-xs text-gray-500">{c.job_title}</p>
                  </div>
                  <Link href={`/jobs/${c.job_id}`} className="text-xs text-red-600 font-medium hover:underline flex items-center gap-1">
                    Review <ArrowRight className="w-3 h-3" />
                  </Link>
                </li>
              ))}
              {unfundedJobs.map((j) => (
                <li key={j.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{j.title} — Bond not funded</p>
                    <p className="text-xs text-gray-500">Job is in draft until bond is staked</p>
                  </div>
                  <BondBadge status="pending" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-400 text-sm">No recent activity yet.</p>
        </div>
      </div>

      {/* Active jobs */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Active Jobs</h2>
          <Link href="/jobs" className="text-sm text-violet-600 hover:underline">View all</Link>
        </div>
        {activeJobs.length === 0 ? (
          <div className="text-center py-10">
            <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No jobs posted yet</p>
            <Link href="/jobs/new" className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-500 transition-colors">
              Post your first job
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.department} · {job.location_type}</p>
                </div>
                <p className="text-sm text-gray-500">{job.applicant_count} applicants</p>
                <BondBadge status={job.bond_status} />
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
