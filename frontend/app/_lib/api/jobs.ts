import { apiFetch } from "./client";
import { Job, JobStatus, BondStatus } from "../types";

interface BackendJob {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location?: string;
  employmentType?: string;
  bonusAmount: string;
  currency?: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, JobStatus> = { DRAFT: "draft", ACTIVE: "active", CLOSED: "closed" };
const BOND_MAP: Record<string, BondStatus> = { DRAFT: "pending", ACTIVE: "staked", CLOSED: "released" };
const LOCATION_TO_BACKEND: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };
const LOCATION_FROM_BACKEND: Record<string, "remote" | "onsite" | "hybrid"> = {
  Remote: "remote",
  "On-site": "onsite",
  Hybrid: "hybrid",
};

function mapJob(b: BackendJob): Job {
  return {
    id: b.id,
    title: b.title,
    department: "—",
    location_type: LOCATION_FROM_BACKEND[b.location ?? "Remote"] ?? "remote",
    description: b.description,
    skills: [],
    status: STATUS_MAP[b.status] ?? "draft",
    bond_status: BOND_MAP[b.status] ?? "pending",
    bond_amount: Number(b.bonusAmount ?? 0),
    applicant_count: 0,
    created_at: b.createdAt,
    published_at: b.publishedAt,
    closed_at: b.closedAt,
  };
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location_type: string;
  description: string;
  skills: string[];
  experience_level: string;
  employment_type: string;
  deadline?: string;
  salary_min?: number;
  salary_max?: number;
  bond_amount?: number | null;
}

export async function getJobs(): Promise<Job[]> {
  const jobs = await apiFetch<BackendJob[]>("/jobs/my");
  return jobs.map(mapJob);
}

export async function getJob(id: string): Promise<Job> {
  const jobs = await apiFetch<BackendJob[]>("/jobs/my");
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error("Job not found");
  return mapJob(job);
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const bonusAmount =
    payload.bond_amount ??
    Math.round((((payload.salary_min ?? 0) + (payload.salary_max ?? 0)) / 2) * 0.04);

  const job = await apiFetch<BackendJob>("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      location: LOCATION_TO_BACKEND[payload.location_type] ?? payload.location_type,
      employmentType: payload.employment_type,
      bonusAmount,
      roleType: "BACKEND",
    }),
  });
  return mapJob(job);
}

export async function publishJob(jobId: string): Promise<Job> {
  const job = await apiFetch<BackendJob>(`/jobs/${jobId}/publish`, { method: "POST" });
  return mapJob(job);
}

export async function closeJob(jobId: string): Promise<Job> {
  const job = await apiFetch<BackendJob>(`/jobs/${jobId}/close`, { method: "POST" });
  return mapJob(job);
}

export async function getBondQuote(
  salaryMin: number,
  salaryMax: number,
): Promise<{ bond_amount: number; salary_min: number; salary_max: number }> {
  const avg = (salaryMin + salaryMax) / 2;
  return { bond_amount: Math.round(avg * 0.04), salary_min: salaryMin, salary_max: salaryMax };
}
