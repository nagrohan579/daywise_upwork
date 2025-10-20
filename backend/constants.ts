// Reserved slugs that cannot be used for custom booking URLs
export const RESERVED_SLUGS = [
  'api', 
  'admin', 
  'dashboard', 
  'auth', 
  'panel', 
  'booking', 
  'book',
  'settings',
  'profile',
  'help',
  'support',
  'contact',
  'about',
  'terms',
  'privacy',
  'login',
  'logout',
  'signup',
  'register'
] as const;

export type ReservedSlug = typeof RESERVED_SLUGS[number];