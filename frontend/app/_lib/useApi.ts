"use client";
import { useEffect, useState, useCallback } from "react";

type ApiState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fn()
      .then((data) => setState({ status: "success", data }))
      .catch((e: Error) => {
        if (e.message === "UNAUTHORIZED") {
          window.location.href = "/login";
          return;
        }
        setState({ status: "error", message: e.message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { state, reload: load };
}
