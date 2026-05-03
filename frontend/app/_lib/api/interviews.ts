import { Interview, InterviewType } from "../types";

interface SchedulePayload {
  candidate_id: string;
  job_id: string;
  date: string;
  type: InterviewType;
  notes?: string;
}

export async function getInterviews(): Promise<Interview[]> {
  return [];
}

export async function getInterviewsForCandidate(_candidateId: string): Promise<Interview[]> {
  return [];
}

export async function scheduleInterview(payload: SchedulePayload): Promise<Interview> {
  return {
    id: `int-${Date.now()}`,
    candidate_id: payload.candidate_id,
    candidate_name: "",
    job_title: "",
    date: payload.date,
    type: payload.type,
    status: "scheduled",
    notes: payload.notes,
  };
}
