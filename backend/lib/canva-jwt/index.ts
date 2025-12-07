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
  const client = jwksClient({
    jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`
  });

  function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
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
      console.error('JWT verification failed:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
