import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
