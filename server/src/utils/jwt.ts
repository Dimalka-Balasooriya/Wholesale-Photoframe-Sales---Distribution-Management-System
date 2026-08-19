import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUser, JwtPayload } from '../types/auth.js';

export function signAccessToken(user: AuthUser) {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    subject: String(user.id)
  };

  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    ...options
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw new Error('Invalid token');
  }

  return {
    sub: Number(decoded.sub),
    role: decoded.role as JwtPayload['role']
  };
}
