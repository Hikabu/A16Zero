"use client";

import { ArrowUpRight, ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmployerAuthCardProps {
  onSwitchToCandidate?: () => void;
}

export function EmployerAuthCard({
  onSwitchToCandidate,
}: EmployerAuthCardProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Employer Login</CardTitle>
        <CardDescription>
          Employer authentication is handled through Privy.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Set `NEXT_PUBLIC_PRIVY_APP_ID` and enable Privy employer auth to
              use `/auth/employer/login`.
            </p>
          </div>
        </div>

        {onSwitchToCandidate && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onSwitchToCandidate}
          >
            Switch to candidate
            <ArrowUpRight className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
