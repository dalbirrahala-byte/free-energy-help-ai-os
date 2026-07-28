"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ActivityHistoryActionsProps = {
  leadId: number;
  activityId: number;
  activityLabel: string;
  deleteActivity: (formData: FormData) => Promise<void>;
};

export function ActivityHistoryActions({
  leadId,
  activityId,
  activityLabel,
  deleteActivity,
}: ActivityHistoryActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleConfirmDelete() {
    formRef.current?.requestSubmit();
    setDialogOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/leads/${leadId}/activity/${activityId}/edit`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Edit
        </Link>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>

      <form ref={formRef} action={deleteActivity} className="hidden">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="activity_id" value={activityId} />
      </form>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-activity-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3
              id="delete-activity-title"
              className="text-lg font-bold text-slate-900"
            >
              Delete activity?
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove{" "}
              <span className="font-semibold text-slate-800">
                {activityLabel}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete activity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
