import { useAuthStore } from "./auth-store";

export const getAccessToken = () => {
  return null;
}

export const setAccessToken = (token: string) => {
  void token;
}

export const logout = async () => {
  if (typeof window !== "undefined") {
    try {
      useAuthStore.getState().logout();
    } catch (e) {
      console.warn("Could not clear auth store", e);
    }
  }
}
