import Image from "next/image";

export function TeamLogo({ src, name, size = 24 }: { src: string | null; name: string; size?: number }) {
  if (!src) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className="flex shrink-0 items-center justify-center rounded-full bg-neutral-800 font-bold text-neutral-400"
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <Image src={src} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}
