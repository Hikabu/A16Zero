import { apiFetch, isApiConfigured } from "./client";

export interface CompanyProfile {
  id: string;
  name: string;
  email?: string;
  walletAddress: string;
  privyId: string;
  _count: { jobPosts: number };
}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<CompanyProfile>("/me/company");
  } catch {
    return null;
  }
}
