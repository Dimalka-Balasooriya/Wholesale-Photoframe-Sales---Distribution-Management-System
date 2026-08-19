export type Role = 'ADMIN' | 'SALES_REP' | 'DRIVER' | 'CUSTOMER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
