import basicAuth from "express-basic-auth";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

/** 20 req/min/IP on admin endpoints */
const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function ipAllowlist(req: Request, res: Response, next: NextFunction) {
  const list = (process.env.ADMIN_IPS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (!list.length) return next();
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
  if (list.includes(ip)) return next();
  return res.status(403).send("Forbidden");
}

// Require admin credentials to be explicitly set
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
  throw new Error("ADMIN_USER and ADMIN_PASS environment variables are required for admin access");
}

const basic = basicAuth({
  challenge: true,
  realm: "Admin Area",
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
});

export const adminAuth = [adminLimiter, ipAllowlist, basic];

/** Did Basic Auth pass on this request? */
export function isBasicAuthed(req: Request): boolean {
  return !!(req as any).auth?.user;
}