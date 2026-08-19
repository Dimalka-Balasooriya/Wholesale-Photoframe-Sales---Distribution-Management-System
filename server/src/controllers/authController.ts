import type { Request, Response } from 'express';
import { z } from 'zod';
import { findAuthUserById, findUserByEmail, toAuthUser } from '../services/userService.js';
import { signAccessToken } from '../utils/jwt.js';
import { verifyPassword } from '../utils/password.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function login(req: Request, res: Response) {
  const credentials = loginSchema.parse(req.body);
  const userRow = await findUserByEmail(credentials.email);

  if (!userRow || userRow.status !== 'ACTIVE') {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isValid = await verifyPassword(credentials.password, userRow.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const user = toAuthUser(userRow);
  const token = signAccessToken(user);

  return res.json({ token, user });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await findAuthUserById(req.user.id);

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return res.json({ user });
}
