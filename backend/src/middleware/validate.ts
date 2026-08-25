import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    next();
  };
}
