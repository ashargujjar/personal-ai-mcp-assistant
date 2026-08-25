import type { SafeUser } from "../utils/user";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export {};
