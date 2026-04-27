import { apiFetch, isApiConfigured } from "./client";

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCandidatesShortlisted: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isApiConfigured()) return { totalJobs: 0, activeJobs: 0, totalCandidatesShortlisted: 0 };
  return apiFetch<DashboardStats>("/analytics/dashboard");
}
