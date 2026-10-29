"use client";

import { useRef, useState } from "react";
import { Avatar } from "./Avatar";

const OUTPUT_SIZE = 256;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Picks an image, crops it to a centred square and shrinks it to 256px in the browser before saving. */
export function AvatarInput({ name, initial, displayName, error }: { name: string; initial?: string | null; displayName: string; error?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [localError, setLocalError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Choose an image file");
    if (file.size > MAX_UPLOAD_BYTES) return setLocalError("Image must be under 15 MB");
    try {
      setValue(await toSquareDataUrl(file));
      setLocalError(undefined);
    } catch {
      setLocalError("Couldn't read that image. Try a JPG or PNG.");
    }
  }

  return (
    <div className="flex items-center gap-5">
      <input type="hidden" name={name} value={value} />
      <Avatar src={value || null} name={displayName || "?"} size="lg" />
      <div className="space-y-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
            {value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button type="button" onClick={() => setValue("")} className="btn-secondary">Remove</button>
          )}
        </div>
        <p className={`text-xs ${localError || error ? "text-red-400" : "text-neutral-600"}`}>
          {localError ?? error ?? "JPG, PNG or WebP. Cropped to a square."}
        </p>
      </div>
    </div>
  );
}

async function toSquareDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUTPUT_SIZE;
  const scale = Math.max(OUTPUT_SIZE / bitmap.width, OUTPUT_SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  canvas.getContext("2d")!.drawImage(bitmap, (OUTPUT_SIZE - w) / 2, (OUTPUT_SIZE - h) / 2, w, h);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.85);
  // Browsers without WebP encoding (older Safari) fall back to PNG, which is much larger, so use JPEG instead.
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}
