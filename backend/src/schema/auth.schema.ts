import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>["body"];

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "idToken is required"),
  }),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>["body"];
