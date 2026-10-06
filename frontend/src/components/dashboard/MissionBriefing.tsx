"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MissionBriefingProps = {
  overdueCount: number;
  followUpCount: number;
  renewalCount: number;
  priorityHref: string;
};

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function MissionBriefing({
  overdueCount,
  followUpCount,
  renewalCount,
  priorityHref,
}: MissionBriefingProps) {
  const [greeting, setGreeting] = useState("Hello");
  const [speechAvailable, setSpeechAvailable] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGreeting(greetingForHour(new Date().getHours()));
      setSpeechAvailable(
        "speechSynthesis" in window &&
          typeof SpeechSynthesisUtterance !== "undefined",
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const briefing = useMemo(() => {
    const parts = [
      `${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}`,
      `${followUpCount} ${followUpCount === 1 ? "lead needs" : "leads need"} follow-up`,
      `${renewalCount} ${renewalCount === 1 ? "renewal is" : "renewals are"} due within 90 days`,
    ];

    const firstPriority =
      overdueCount > 0
        ? "Deal with the overdue task first."
        : followUpCount > 0
          ? "Start with the leads needing follow-up."
          : renewalCount > 0
            ? "Review the upcoming renewal."
            : "There are no urgent revenue actions right now.";

    return {
      summary: `You have ${parts.join(", ")}.`,
      firstPriority,
    };
  }, [overdueCount, followUpCount, renewalCount]);

  function speakBriefing() {
    if (!speechAvailable) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${greeting}, Dalbir. ${briefing.summary} ${briefing.firstPriority}`,
    );
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section
      aria-labelledby="mission-briefing-title"
      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Mission briefing
          </p>
          <h2 id="mission-briefing-title" className="mt-1 text-2xl font-bold text-slate-950">
            {greeting}, Dalbir.
          </h2>
          <p className="mt-2 text-sm text-slate-700">{briefing.summary}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            First priority: {briefing.firstPriority}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Read-only guidance from live CRM data. No message, call, status change, or customer action is sent automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={speakBriefing}
            disabled={!speechAvailable}
            className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            Speak briefing
          </button>
          <Link
            href={priorityHref}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Open priority
          </Link>
        </div>
      </div>
    </section>
  );
}
