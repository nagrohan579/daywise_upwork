// server/lib/slug.ts
import { db } from "../db";
import { users } from "@shared/schema";
import { and, eq, ne } from "drizzle-orm";

export const toSlug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function ensureUniqueSlug(
  base: string, 
  userId: string
): Promise<string> {
  let candidate = base || "book";
  let n = 1;
  
  while (true) {
    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.slug, candidate), ne(users.id, userId)))
      .limit(1);
      
    if (existing.length === 0) {
      return candidate;
    }
    
    n += 1;
    candidate = `${base}-${n}`;
  }
}