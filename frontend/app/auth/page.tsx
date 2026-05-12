"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { CandidateAuthCard } from "@/components/auth/CandidateAuthCard";
import { EmailVerifyModal } from "@/components/auth/EmailVerifyModal";
import { EmployerAuthCard } from "@/components/auth/EmployerAuthCard";
import { MfaModal } from "@/components/auth/MfaModal";
import {
  OnboardingModal,
  type OnboardingFormValues,
} from "@/components/auth/OnboardingModal";
// FIX:
// Your file at /components/auth/PrivyEmployerAuthCard.tsx
// does not export PrivyEmployerAuthCard.
// Either:
// 1. export const PrivyEmployerAuthCard = ...
// OR
// 2. export default PrivyEmployerAuthCard
//
// This import assumes DEFAULT export.
import {PrivyEmployerAuthCard} from "@/components/auth/PrivyEmployerAuthCard";

import { ModeFormTransition, ModeSwitcher } from "@/components/ModeSwitcher";
import {
  completeOnboarding,
  getApiErrorMessage,
  getEmployerProfile,
  apiFetch,
  registerCandidate,
  verifyEmail,
  verifyMfa,
  verifyMfaRecovery,
  type AuthRole,
  type AuthResponse,
  type CandidateRegisterInput,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type Mode = "candidate" | "employer";
type PasswordResetStep = 1 | 2 | null;

const PRIVY_ENABLED =
  process.env.NEXT_PUBLIC_PRIVY_ENABLED === "true" &&
  Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function routeForRole(role: AuthRole | string | null | undefined) {
  return role === "employer" ? "/dashboard" : "/profile";
}

function storeAndRoute(
  data: AuthResponse,
  router: ReturnType<typeof useRouter>,
) {
  useAuthStore.getState().setAuth({
    token: "__cookie_auth__",
    role: data.role,
    username: data.username,
  });

  router.push(routeForRole(data.role));
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const [mode, setMode] = useState<Mode>("candidate");
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [passwordResetStep, setPasswordResetStep] =
    useState<PasswordResetStep>(null);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaUserId, setMfaUserId] = useState<string | undefined>();
  const [pendingRegistration, setPendingRegistration] =
    useState<CandidateRegisterInput | null>(null);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // IMPORTANT:
  // Only validate if token exists.
  // Your previous version validated even without a token,
  // which caused auth redirects / login flashes.
  const [isValidating, setIsValidating] = useState(Boolean(token));

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      // No token -> stay on page.
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        if (role === "employer") {
          await getEmployerProfile();
        } else {
          await apiFetch("/me/user", {
            method: "GET",
          });
        }

        if (!cancelled && role) {
          router.replace(routeForRole(role));
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          setIsValidating(false);
        }
      }
    }

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [token, role, router, clearAuth]);

  useEffect(() => {
    if (searchParams.get("clear_session") === "true") {
      useAuthStore.getState().clearAuth();
      router.replace("/auth");
      return;
    }

    const resetToken =
      searchParams.get("reset_token") ?? searchParams.get("token");

    if (resetToken) {
      setMode("candidate");
      setPasswordResetStep(2);
    }

    if (searchParams.get("oauth") === "success") {
      useAuthStore.getState().setAuth({
        token: "__cookie_auth__",
        role: "candidate",
      });

      router.replace("/profile");
      return;
    }

    const mfaToken = searchParams.get("mfa_token");

    if (mfaToken) {
      setMode("candidate");
      setMfaTempToken(mfaToken);
      setMfaUserId(searchParams.get("user_id") ?? undefined);
      setMfaError(null);
      setShowMfa(true);
    }

    if (searchParams.get("onboarding") === "1") {
      setMode("candidate");
      setOnboardingError(null);
      setShowOnboarding(true);
    }

    if (searchParams.get("verify_email")) {
      setMode("candidate");
      setEmailVerifyError(null);
      setShowEmailVerify(true);
    }
  }, [router, searchParams]);

  const verifyEmailMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      setEmailVerifyError(null);
      setShowEmailVerify(false);
      router.push("/auth");
    },
    onError: () => {
      setEmailVerifyError("Invalid or expired code");
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: registerCandidate,
    onError: (err) => {
      setEmailVerifyError(getApiErrorMessage(err));
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data, variables) => {
      const nextRole = data.role ?? variables.role ?? "candidate";

      useAuthStore.getState().setAuth({
        token: "__cookie_auth__",
        role: nextRole,
        username: data.username ?? variables.username,
      });

      router.push(routeForRole(nextRole));
    },
    onError: (err) => {
      setOnboardingError(getApiErrorMessage(err));
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: verifyMfa,
    onSuccess: (data) => {
      setMfaError(null);
      setShowMfa(false);
      storeAndRoute(data, router);
    },
    onError: () => {
      setMfaError("Invalid code. Try again.");
    },
  });

  const verifyRecoveryMutation = useMutation({
    mutationFn: verifyMfaRecovery,
    onSuccess: (data) => {
      setMfaError(null);
      setShowMfa(false);
      storeAndRoute(data, router);
    },
    onError: () => {
      setMfaError("Invalid code. Try again.");
    },
  });

  function handleRegisterSuccess(data: CandidateRegisterInput) {
    setPendingRegistration(data);
    setEmailVerifyError(null);
    setShowEmailVerify(true);
  }

  function handleMfaRequired({
    token: nextToken,
    userId,
  }: {
    token: string;
    userId?: string;
  }) {
    setMfaTempToken(nextToken);
    setMfaUserId(userId);
    setMfaError(null);
    setShowMfa(true);
  }

  function handleOnboardingComplete(data: OnboardingFormValues) {
    setOnboardingError(null);
    onboardingMutation.mutate(data);
  }

  // Loading screen while validating existing session.
  if (isValidating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <ModeSwitcher mode={mode} onChange={setMode} />

        <ModeFormTransition modeKey={mode}>
          {mode === "candidate" ? (
            <CandidateAuthCard
              onRegisterSuccess={handleRegisterSuccess}
              onMfaRequired={handleMfaRequired}
              onEmailVerificationRequired={() => {
                setEmailVerifyError(null);
                setShowEmailVerify(true);
              }}
              passwordResetStep={passwordResetStep}
              onPasswordResetBack={() => setPasswordResetStep(null)}
              onPasswordResetSuccess={() => {
                setPasswordResetStep(null);
                router.push("/auth");
              }}
            />
          ) : PRIVY_ENABLED ? (
            <PrivyEmployerAuthCard
              onSwitchToCandidate={() => setMode("candidate")}
            />
          ) : (
            <EmployerAuthCard
              onSwitchToCandidate={() => setMode("candidate")}
            />
          )}
        </ModeFormTransition>
      </div>

      <EmailVerifyModal
        open={showEmailVerify}
        onVerify={(code) => verifyEmailMutation.mutate({ code })}
        onResend={() => {
          if (pendingRegistration) {
            resendEmailMutation.mutate(pendingRegistration);
          }
        }}
        isVerifying={verifyEmailMutation.isPending}
        isResending={resendEmailMutation.isPending}
        error={emailVerifyError}
      />

      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        isSubmitting={onboardingMutation.isPending}
        error={onboardingError}
      />

      <MfaModal
        open={showMfa}
        onVerify={({ mode: mfaMode, code }) => {
          if (!mfaTempToken) {
            setMfaError("Invalid code. Try again.");
            return;
          }

          if (mfaMode === "recovery") {
            verifyRecoveryMutation.mutate({
              mfaToken: mfaTempToken,
              userId: mfaUserId,
              backupCode: code,
            });

            return;
          }

          verifyMfaMutation.mutate({
            mfaToken: mfaTempToken,
            userId: mfaUserId,
            code,
          });
        }}
        isVerifying={
          verifyMfaMutation.isPending || verifyRecoveryMutation.isPending
        }
        error={mfaError}
      />
    </main>
  );
}
