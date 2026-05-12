import Cookies from "js-cookie";
import { useAuthStore } from "./auth-store";

const COOKIE_NAME = "access_token";

export const getAccessToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get(COOKIE_NAME) || localStorage.getItem("accessToken") || null;
  }
  return null;
}

export const setAccessToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
    Cookies.set(COOKIE_NAME, token, { expires: 7, path: "/" });
  }
}

export const logout = async () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    Cookies.remove(COOKIE_NAME, { path: "/" });
    
    // Also clear existing auth store items
    try {
      useAuthStore.getState().logout();
    } catch (e) {
      console.warn("Could not clear auth store", e);
    }
  }
}
