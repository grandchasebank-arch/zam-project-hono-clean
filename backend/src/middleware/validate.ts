import { createMiddleware } from "hono/factory";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors";

export const validateJson = (schema: ZodSchema) =>
  createMiddleware(async (c, next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const message = result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new AppError(400, message, "VALIDATION_ERROR");
    }

    c.set("validated", result.data);
    await next();
  });
