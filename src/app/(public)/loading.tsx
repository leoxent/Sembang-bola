import { Spinner } from "@/components/ui/Spinner";

// Shown while a public page loads.
export default function PublicLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-neutral-400">
      <Spinner className="h-6 w-6 text-emerald-400" />
      Tunggu sekejap…
    </div>
  );
}
