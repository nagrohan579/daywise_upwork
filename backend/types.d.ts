import 'express-session';

declare module 'express-serve-static-core' {
  interface Request {
    session: session.Session & {
      userId?: string;
      email?: string;
    };
    sessionID: string;
  }
}

