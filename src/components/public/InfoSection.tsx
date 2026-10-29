/** A titled block of body text, for the plain-text pages (Tentang kami, Privasi). */
export function InfoSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-neutral-300">{children}</div>
    </section>
  );
}
