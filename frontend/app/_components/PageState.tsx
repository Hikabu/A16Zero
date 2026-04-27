import { AlertCircle, RefreshCw } from "lucide-react";
import { CardSkeleton, TableRowSkeleton } from "./Skeleton";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-8 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
      <p className="text-gray-400 text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}
