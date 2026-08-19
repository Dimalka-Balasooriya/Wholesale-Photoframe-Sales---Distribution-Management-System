export type RoleName = 'ADMIN' | 'SALES_REP' | 'DRIVER' | 'CUSTOMER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: RoleName;
}

export interface JwtPayload {
  sub: number;
  role: RoleName;
}
