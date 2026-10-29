import { Spinner } from "@/components/ui/Spinner";

// Shown while an admin page loads, so a click never looks like it did nothing.
export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-neutral-400">
      <Spinner className="h-5 w-5 text-emerald-400" />
      Loading…
    </div>
  );
}
