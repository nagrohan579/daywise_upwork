import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include Canva user info
declare global {
  namespace Express {
    interface Request {
      canva?: {
        appId: string;
        userId: string;
        brandId: string;
      };
    }
  }
}

export function createJwtMiddleware(appId: string) {
  if (!appId) {
    throw new Error('CANVA_APP_ID environment variable is required. Please set it in your backend .env file.');
  }

  console.log(`[Canva JWT] Initializing middleware with appId: ${appId}`);

  const client = jwksClient({
    jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`,
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  function getKey(header: any, callback: any) {
    if (!header?.kid) {
      return callback(new Error('Missing kid in token header'), undefined);
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('[Canva JWT] Failed to get signing key', {
          kid: header?.kid,
          alg: header?.alg,
          appId,
          error: err?.message,
        });
        return callback(err, undefined);
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      // Decode token header to check algorithm
      const decodedHeader = jwt.decode(token, { complete: true }) as any;
      if (!decodedHeader?.header) {
        console.error('[Canva JWT] Invalid token structure - missing header');
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Basic sanity check on algorithm
      if (decodedHeader.header.alg !== 'RS256') {
        console.error('[Canva JWT] Unexpected JWT alg', { alg: decodedHeader.header.alg });
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Verify token using CANVA_APP_ID from environment
      // The token's 'aud' (audience) field should match the appId
      const decoded = await new Promise<any>((resolve, reject) => {
        jwt.verify(token, getKey, { 
          algorithms: ['RS256'],
          audience: appId, // Verify the audience matches our appId
        }, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });

      // Canva JWT payload structure: { aud, userId, brandId, ... }
      // aud is the appId, not a separate appId field
      if (!decoded.userId || !decoded.brandId) {
        console.error('[Canva JWT] Missing required fields in token payload', {
          hasUserId: !!decoded.userId,
          hasBrandId: !!decoded.brandId,
          aud: decoded.aud,
        });
        return res.status(401).json({ message: 'Invalid token: missing required fields' });
      }

      // Attach Canva user info to request
      // Use 'aud' from token as appId (it should match the env var, but use what's in token)
      req.canva = {
        appId: decoded.aud || appId, // Use aud from token, fallback to env appId
        userId: decoded.userId,
        brandId: decoded.brandId
      };

      next();
    } catch (error) {
      console.error('[Canva JWT] verification failed', {
        message: (error as any)?.message,
        name: (error as any)?.name,
        appId,
      });
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
