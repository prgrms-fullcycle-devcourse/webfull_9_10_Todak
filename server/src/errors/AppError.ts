import { ERROR_CODES, ErrorCodeKey } from "./error.code.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(errorKey: ErrorCodeKey) {
    const error = ERROR_CODES[errorKey];
    super(error.message);
    this.name = "AppError";
    this.statusCode = error.statusCode;
    this.code = error.code;
    Error.captureStackTrace(this, this.constructor);
  }
}
