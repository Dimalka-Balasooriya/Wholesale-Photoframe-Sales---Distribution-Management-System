import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';
import type { AuthUser, RoleName } from '../types/auth.js';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role_name: RoleName;
  status: 'ACTIVE' | 'INACTIVE';
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role_name
  };
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT u.id, u.name, u.email, u.password_hash, u.status, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = :email
     LIMIT 1`,
    { email }
  );

  return rows[0] ?? null;
}

export async function findAuthUserById(id: number) {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT u.id, u.name, u.email, u.password_hash, u.status, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = :id AND u.status = 'ACTIVE'
     LIMIT 1`,
    { id }
  );

  return rows[0] ? toAuthUser(rows[0]) : null;
}

export { toAuthUser };
