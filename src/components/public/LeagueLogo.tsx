import Image, { type ImageProps } from "next/image";

/** League logos are stored as ESPN's dark-background variant; light mode shows the regular one instead. */
export function LeagueLogo({ src, className = "", ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const lightSrc = src.replace("/500-dark/", "/500/");
  if (lightSrc === src) return <Image src={src} className={className} {...props} />;
  return (
    <>
      <Image src={src} className={`${className} theme-dark-only`} {...props} />
      <Image src={lightSrc} className={`${className} theme-light-only`} {...props} />
    </>
  );
}
