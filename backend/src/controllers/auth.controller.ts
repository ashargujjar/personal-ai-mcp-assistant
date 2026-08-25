import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/connect";
import type { LoginInput, SignupInput } from "../schema/auth.schema";
import { AppError } from "../middleware/errorHandler";
import { toSafeUser } from "../utils/user";
import { signToken } from "../utils/jwt";

const SALT_ROUNDS = 10;

export async function signup(
  req: Request<unknown, unknown, SignupInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword } });
    const token = signToken(user.id, user.email);

    res.status(201).json({ data: { user: toSafeUser(user), token } });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signToken(user.id, user.email);

    res.json({ data: { user: toSafeUser(user), token } });
  } catch (err) {
    next(err);
  }
}
