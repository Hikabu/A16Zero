"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthRole = "candidate" | "employer";

type AuthState = {
  token: string | null;
  role: AuthRole | null;
  username: string | null;
  setAuth: (auth: {
    token?: string | null;
    role?: AuthRole | string | null;
    username?: string | null;
  }) => void;
  clearAuth: () => void;
};

function normalizeRole(role?: AuthRole | string | null): AuthRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.toLowerCase();
  if (normalized === "candidate" || normalized === "employer") {
    return normalized;
  }
  if (normalized === "recruiter") {
    return "employer";
  }

  return null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      username: null,
      setAuth: ({ token, role, username }) =>
        set((state) => ({
          token: token ?? state.token,
          role: normalizeRole(role) ?? state.role,
          username: username ?? state.username,
        })),
      clearAuth: () => set({ token: null, role: null, username: null }),
    }),
    { name: "16signals-auth" },
  ),
);

if (typeof globalThis !== "undefined") {
  globalThis.useAuthStore = useAuthStore;
}
