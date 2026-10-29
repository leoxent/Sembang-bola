import { AdminDashboardButton } from "@/components/public/AdminShortcuts";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
      <SiteFooter />
      <AdminDashboardButton />
    </>
  );
}
