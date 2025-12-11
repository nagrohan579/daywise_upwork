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
    console.warn('[Canva JWT] Missing CANVA_APP_ID. JWT verification will fail.');
  }

  const client = jwksClient({
    jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`
  });

  function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('[Canva JWT] Failed to get signing key', {
          kid: header?.kid,
          alg: header?.alg,
          error: err?.message,
        });
        return callback(err, undefined);
      }
      const signingKey = key?.getPublicKey();
      callback(err, signingKey);
    });
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      const decodedHeader = jwt.decode(token, { complete: true }) as any;
      if (!decodedHeader?.header) {
        console.error('[Canva JWT] Invalid token header');
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Basic sanity check on algorithm
      if (decodedHeader.header.alg !== 'RS256') {
        console.error('[Canva JWT] Unexpected JWT alg', { alg: decodedHeader.header.alg });
        return res.status(401).json({ message: 'Invalid token' });
      }

      const decoded = await new Promise<any>((resolve, reject) => {
        jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });

      // Attach Canva user info to request
      req.canva = {
        appId: decoded.appId,
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
