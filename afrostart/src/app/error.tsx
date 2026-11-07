"use client";

/** Safe error page: never shows technical details to visitors. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-slate-500">Please try again. If it keeps happening, come back in a few minutes.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </main>
  );
}
