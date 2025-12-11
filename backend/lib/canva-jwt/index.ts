import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
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

export function createJwtMiddleware(defaultAppId?: string) {
  // Create a cache for JWKS clients per appId
  const jwksClients = new Map<string, JwksClient>();

  function getJwksClient(appId: string): jwksClient.JwksClient {
    if (!jwksClients.has(appId)) {
      const client = jwksClient({
        jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`,
        cache: true,
        cacheMaxAge: 86400000, // 24 hours
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
      jwksClients.set(appId, client);
    }
    return jwksClients.get(appId)!;
  }

  function getKey(appId: string, header: any, callback: any) {
    const client = getJwksClient(appId);
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
      // Decode token without verification to extract appId
      const decodedHeader = jwt.decode(token, { complete: true }) as any;
      if (!decodedHeader?.header || !decodedHeader?.payload) {
        console.error('[Canva JWT] Invalid token structure');
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Basic sanity check on algorithm
      if (decodedHeader.header.alg !== 'RS256') {
        console.error('[Canva JWT] Unexpected JWT alg', { alg: decodedHeader.header.alg });
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Extract appId from token payload (or use default from env)
      const tokenAppId = decodedHeader.payload.appId || defaultAppId;
      
      if (!tokenAppId) {
        console.error('[Canva JWT] No appId found in token and CANVA_APP_ID not set');
        return res.status(401).json({ message: 'Invalid token: missing appId' });
      }

      // Verify token using the appId from the token
      const decoded = await new Promise<any>((resolve, reject) => {
        jwt.verify(token, (header, callback) => getKey(tokenAppId, header, callback), { 
          algorithms: ['RS256'] 
        }, (err, decoded) => {
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
        defaultAppId,
      });
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
