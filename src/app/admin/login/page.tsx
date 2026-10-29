import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: { absolute: "Sign in · Sembang Bola Admin" }, robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-lg font-black text-neutral-950">
            SB
          </div>
          <h1 className="text-xl font-semibold">Sembang Bola Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to manage articles and AI content</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
