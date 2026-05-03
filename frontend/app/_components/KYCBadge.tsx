import { KYCStatus } from "../_lib/types";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const config: Record<KYCStatus, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700", Icon: ShieldCheck },
  pending: { label: "KYC Pending", className: "bg-yellow-100 text-yellow-700", Icon: ShieldAlert },
  failed: { label: "KYC Failed", className: "bg-red-100 text-red-700", Icon: ShieldX },
};

export function KYCBadge({ status }: { status: KYCStatus }) {
  const { label, className, Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
