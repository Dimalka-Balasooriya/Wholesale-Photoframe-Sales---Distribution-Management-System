import type { NextFunction, Request, Response } from 'express';
import type { RoleName } from '../types/auth.js';

export function authorize(...roles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this resource' });
    }

    return next();
  };
}
