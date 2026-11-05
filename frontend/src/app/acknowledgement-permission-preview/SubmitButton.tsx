'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-disabled={pending}
    className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
    {pending ? 'Saving…' : children}
  </button>;
}
