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

/**
 * Formats a user's name into a properly formatted business name
 * Removes special characters, converts to title case, and appends "'s Business"
 * 
 * Example: "xyz_qwe-abc def" -> "Xyz Qwe Abc Def's Business"
 * 
 * @param name - The user's full name (can include special characters, underscores, hyphens, etc.)
 * @returns Formatted business name in Title Case with "'s Business" appended
 */
export function generateBusinessName(name: string): string {
  if (!name || typeof name !== 'string') {
    return "My Business";
  }

  // Remove all special characters except spaces and hyphens
  // Replace underscores, commas, and other special chars with spaces
  let cleaned = name
    .replace(/[_,;:.!?@#$%^&*()+=[\]{}|\\<>~`"']/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  // Split by spaces and filter out empty strings
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);

  // Convert each word to title case (first letter uppercase, rest lowercase)
  const titleCaseWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Join words and append "'s Business"
  const businessName = titleCaseWords.join(' ') + "'s Business";

  return businessName;
}

/**
 * Generates a URL-friendly slug from a business name
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 * 
 * Example: "Xyz Qwe Abc Def's Business" -> "xyz-qwe-abc-defs-business"
 * 
 * @param businessName - The formatted business name
 * @returns URL-friendly slug in lowercase with hyphens
 */
export function generateSlug(businessName: string): string {
  if (!businessName || typeof businessName !== 'string') {
    return "my-business";
  }

  // Convert to lowercase
  let slug = businessName.toLowerCase();

  // Remove apostrophes
  slug = slug.replace(/'/g, '');

  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');

  // Remove all special characters except hyphens
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Replace multiple consecutive hyphens with a single hyphen
  slug = slug.replace(/-+/g, '-');

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Ensure slug is not empty
  if (!slug) {
    slug = "my-business";
  }

  return slug;
}

/**
 * Generates both business name and slug from a user's name in one call
 * 
 * @param name - The user's full name
 * @returns Object containing both businessName and slug
 */
export function generateBusinessIdentifiers(name: string): { businessName: string; slug: string } {
  const businessName = generateBusinessName(name);
  const slug = generateSlug(businessName);
  
  return { businessName, slug };
}