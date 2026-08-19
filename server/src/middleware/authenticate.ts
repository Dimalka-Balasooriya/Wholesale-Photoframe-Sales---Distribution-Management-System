import type { NextFunction, Request, Response } from 'express';
import { findAuthUserById } from '../services/userService.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    const user = await findAuthUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
