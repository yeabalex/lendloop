import {
  PublicHeroCta,
  PublicToolBoard,
} from "@/components/tools/public-tool-board";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          LendLoop
        </h1>
        <p className="mt-4 text-xl text-zinc-500 dark:text-zinc-400">
          Borrow what you need. Lend what you don&apos;t.
        </p>
        <PublicHeroCta />
      </section>

      {/* Read-only available tools (name & category only, no owner details) */}
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Available Tools
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Read-only preview · Sign in for details &amp; borrowing
          </span>
        </div>
        <PublicToolBoard />
      </section>
    </div>
  );
}
