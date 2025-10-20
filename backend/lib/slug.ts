// server/lib/slug.ts
import { storage } from "../storage";

export const toSlug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function ensureUniqueSlug(
  base: string,
  userId: string
): Promise<string> {
  let candidate = base || "book";
  let n = 1;

  while (true) {
    const existing = await storage.getUserBySlug(candidate);

    if (!existing || existing._id === userId) {
      return candidate;
    }

    n += 1;
    candidate = `${base}-${n}`;
  }
}