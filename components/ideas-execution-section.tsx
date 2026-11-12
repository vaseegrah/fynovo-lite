"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

export function IdeasExecutionSection() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between pt-4" aria-label="Ideas and Execution">
      <button
        type="button"
        aria-label="Open Execution"
        title="Execution"
        onClick={() => router.push("/execution" as any)}
        className="grid h-8 w-8 place-items-center rounded-full bg-danger text-white shadow-[0_4px_10px_rgba(217,83,79,0.35)] transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-danger/20"
      >
        <Minus className="h-5 w-5" strokeWidth={2.7} />
      </button>

      <button
        type="button"
        aria-label="Open Ideas"
        title="Ideas"
        onClick={() => router.push("/ideas" as any)}
        className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white shadow-[0_4px_10px_rgba(23,124,99,0.35)] transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand/20"
      >
        <Plus className="h-5 w-5" strokeWidth={2.7} />
      </button>
    </div>
  );
}
