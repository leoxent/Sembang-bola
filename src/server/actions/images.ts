"use server";

import { requireAdmin } from "@/lib/auth/session";
import { searchCommons, type CommonsImage } from "@/lib/wikimedia";

export async function searchImages(query: string): Promise<{ images?: CommonsImage[]; error?: string }> {
  await requireAdmin();
  const q = query.trim().slice(0, 100);
  if (!q) return { error: "Taip kata kunci dulu" };
  try {
    return { images: await searchCommons(q) };
  } catch (err) {
    console.error("[search-images]", err);
    return { error: "Couldn't reach Wikimedia Commons. Try again." };
  }
}
