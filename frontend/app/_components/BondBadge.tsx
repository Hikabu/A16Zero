import { BondStatus } from "../_lib/types";

const config: Record<BondStatus, { label: string; className: string }> = {
  pending: { label: "Awaiting Funding", className: "bg-orange-100 text-orange-700 border-orange-200" },
  staked: { label: "Bond Active", className: "bg-green-100 text-green-700 border-green-200" },
  released: { label: "Bond Released", className: "bg-gray-100 text-gray-600 border-gray-200" },
  forfeited: { label: "Bond Forfeited", className: "bg-red-100 text-red-700 border-red-200" },
};

export function BondBadge({ status }: { status: BondStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
