import type { ErrorHandler } from "hono";
import { AppError } from "../lib/errors";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(err);

  if (err instanceof AppError) {
    return c.json(
      { success: false, error: err.message, code: err.code },
      err.status as any
    );
  }

  if (err instanceof SyntaxError && "body" in err) {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  return c.json(
    { success: false, error: "Internal server error" },
    500
  );
};
