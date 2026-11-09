import { SignInButton } from "@clerk/nextjs";
import { ToolList } from "@/components/tools/tool-list";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight">LendLoop</h1>
        <p className="mt-4 text-xl text-zinc-500">
          Borrow what you need. Lend what you don't.
        </p>
        <div className="mt-8">
          <SignInButton mode="modal">
            <button className="rounded-full bg-zinc-900 px-8 py-3 text-white hover:bg-zinc-700 transition-colors">
              Sign in to lend or borrow
            </button>
          </SignInButton>
        </div>
      </section>

      {/* Read-only tool list */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Available Tools</h2>
        {/* TODO: pass Convex data once wired */}
        <ToolList publicView />
      </section>
    </div>
  );
}

