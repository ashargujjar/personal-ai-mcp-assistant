export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
