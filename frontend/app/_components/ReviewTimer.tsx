"use client";
import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

function getTimeRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, isWarning: diff < 4 * 60 * 60 * 1000 };
}

export function ReviewTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(deadline));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getTimeRemaining(deadline)), 30000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!remaining) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </span>
    );
  }

  const { hours, minutes, isWarning } = remaining;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        isWarning
          ? "text-orange-700 bg-orange-50 border border-orange-200"
          : "text-blue-700 bg-blue-50 border border-blue-200"
      }`}
    >
      <Clock className="w-3 h-3" />
      {hours}h {minutes}m remaining
    </span>
  );
}
