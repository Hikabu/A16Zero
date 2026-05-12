"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import Cookies from "js-cookie";

export type AuthRole = "candidate" | "employer";

const ROLE_COOKIE_NAME = "16signals-role";
const PERSIST_KEY = "16signals-auth";

type AuthState = {
  token: string | null;
  role: AuthRole | null;
  username: string | null;
  email: string | null;
  walletAddress: string | null;
  id: string | null;
  user: { id: string } | null;
  isRestoring: boolean;
  setAuth: (auth: {
    role?: AuthRole | string | null;
    username?: string | null;
    email?: string | null;
    walletAddress?: string | null;
    id?: string | null;
  }) => void;
  setRestoring: (isRestoring: boolean) => void;
  clearAuth: () => void;
  /**
   * Full logout: clears Zustand, cookies, localStorage persist key, and
   * dispatches a custom `auth:logout` DOM event so the AppProviders router
   * listener can navigate to /auth without the store importing Next.js router.
   */
  logout: () => void;
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
      role: null,
      token: null,
      username: null,
      email: null,
      walletAddress: null,
      id: null,
      user: null,
      isRestoring: true,

      setAuth: ({ role, username, email, walletAddress, id }) => {
        const normalizedRole = normalizeRole(role);

        // Non-sensitive route hint only. HttpOnly auth cookies are server-owned.
        if (normalizedRole) {
          Cookies.set(ROLE_COOKIE_NAME, normalizedRole, { expires: 7, path: "/" });
        } else if (role === null) {
          Cookies.remove(ROLE_COOKIE_NAME);
        }

        set((state) => ({
          role: normalizedRole ?? state.role,
          username: username ?? state.username,
          email: email ?? state.email,
          walletAddress: walletAddress ?? state.walletAddress,
          id: id ?? state.id,
          user: id ?? state.id ? { id: (id ?? state.id) as string } : null,
          isRestoring: false,
        }));
      },

      setRestoring: (isRestoring) => set({ isRestoring }),

      clearAuth: () => {
        Cookies.remove(ROLE_COOKIE_NAME);
        set({ token: null, role: null, username: null, email: null, walletAddress: null, id: null, user: null, isRestoring: false });
      },

      logout: () => {
        Cookies.remove(ROLE_COOKIE_NAME);

        set({ token: null, role: null, username: null, email: null, walletAddress: null, id: null, user: null, isRestoring: false });

        // 3. Clear the Zustand persist storage (localStorage key)
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(PERSIST_KEY);
          } catch {
            // Storage may be unavailable (SSR/incognito edge cases)
          }

          // 4. Notify the router listener in AppProviders to navigate to /auth
          window.dispatchEvent(new Event("auth:logout"));
        }
      },
    }),
    { name: PERSIST_KEY },
  ),
);

if (typeof globalThis !== "undefined") {
  globalThis.useAuthStore = useAuthStore;
}
