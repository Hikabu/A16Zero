import { apiFetch } from "./client";
import { Candidate, CandidateStage } from "../types";

interface BackendCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  skills: string[];
}

function mapCandidate(b: BackendCandidate): Candidate {
  return {
    id: b.id,
    name: `${b.firstName} ${b.lastName}`,
    headline: b.email,
    location: "—",
    kyc_status: "pending",
    current_stage: "applied",
    review_deadline: null,
    stage_history: [],
    skills: b.skills ?? [],
    experience: [],
    applied_at: new Date().toISOString(),
  };
}

async function fetchAllCandidates(): Promise<Candidate[]> {
  const data = await apiFetch<BackendCandidate[]>("/applicants");
  return data.map(mapCandidate);
}

export async function getCandidates(jobId?: string): Promise<Candidate[]> {
  const candidates = await fetchAllCandidates();
  if (jobId) return candidates.filter((c) => !c.job_id || c.job_id === jobId);
  return candidates;
}

export async function getCandidate(id: string): Promise<Candidate> {
  const candidates = await fetchAllCandidates();
  const c = candidates.find((c) => c.id === id);
  if (!c) throw new Error("Candidate not found");
  return c;
}

export async function moveCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<Candidate> {
  const candidates = await fetchAllCandidates();
  const c = candidates.find((c) => c.id === candidateId);
  if (!c) throw new Error("Candidate not found");
  return {
    ...c,
    current_stage: stage,
    review_deadline:
      stage === "review"
        ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
        : c.review_deadline,
  };
}

interface MatchesResponse {
  top: Candidate[];
  potential: Candidate[];
  general: Candidate[];
}

export async function getJobMatches(jobId: string): Promise<MatchesResponse> {
  const candidates = await fetchAllCandidates();
  return {
    top: candidates.slice(0, 2),
    potential: candidates.slice(2, 4),
    general: candidates.slice(4),
  };
}

export async function getShortlist(): Promise<Candidate[]> {
  return fetchAllCandidates();
}

export async function toggleShortlist(
  candidateId: string,
  shortlisted: boolean,
  jobId?: string,
): Promise<void> {
  if (!shortlisted || !jobId) return;
  await apiFetch(`/applicants/shortlist/${jobId}/${candidateId}`, {
    method: "POST",
  });
}
