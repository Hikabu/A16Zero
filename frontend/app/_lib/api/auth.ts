import { apiFetch, setToken, clearToken } from "./client";

// Called after Privy auth — exchange Privy token for our app JWT.
// Privy token goes in the Authorization header; wallet addresses in the body.
export async function login(
  privyToken: string,
  walletAddress: string,
  smartAccountAddress?: string,
): Promise<string> {
  const data = await apiFetch<{ accessToken: string }>("/auth/employer/login", {
    method: "POST",
    headers: { Authorization: `Bearer ${privyToken}` },
    body: JSON.stringify({
      walletAddress,
      ...(smartAccountAddress ? { smartAccountAddress } : {}),
    }),
  });
  setToken(data.accessToken);
  return data.accessToken;
}

export function logout(): void {
  clearToken();
}
