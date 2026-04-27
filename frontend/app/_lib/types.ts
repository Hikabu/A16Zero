export type BondStatus = "pending" | "staked" | "released" | "forfeited";
export type JobStatus = "draft" | "active" | "paused" | "closed";
export type KYCStatus = "verified" | "pending" | "failed";
export type CandidateStage = "applied" | "review" | "interview" | "offer" | "hired" | "rejected";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";
export type InterviewType = "video" | "phone" | "in-person";

export interface Job {
  id: string;
  title: string;
  department: string;
  location_type: "remote" | "onsite" | "hybrid";
  description: string;
  skills: string[];
  status: JobStatus;
  bond_status: BondStatus;
  bond_amount: number;
  applicant_count: number;
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
}

export interface StageHistoryEntry {
  stage: CandidateStage;
  changed_at: string;
  changed_by: string;
}

export interface Candidate {
  id: string;
  name: string;
  headline: string;
  location: string;
  kyc_status: KYCStatus;
  current_stage: CandidateStage;
  review_deadline: string | null;
  stage_history: StageHistoryEntry[];
  skills: string[];
  experience: { company: string; role: string; years: number }[];
  job_id?: string;
  job_title?: string;
  applied_at: string;
}

export interface Transaction {
  id: string;
  type: "deposit" | "bond_locked" | "bond_released";
  amount: string;
  status: "confirmed" | "pending" | "failed";
  created_at: string;
}

export interface Bond {
  job_id: string;
  job_title: string;
  amount: string;
  bond_status: BondStatus;
  staked_at: string;
}

export interface WalletData {
  wallet_address: string;
  balance: string;
  transactions: Transaction[];
  bonds: Bond[];
}

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name: string;
  job_title: string;
  date: string;
  type: InterviewType;
  status: InterviewStatus;
  notes?: string;
}
