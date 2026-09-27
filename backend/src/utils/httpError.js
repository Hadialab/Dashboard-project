// Errors thrown with an explicit status. The error handler turns these into
// JSON responses; anything else becomes a 500.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = "Not Found") => new HttpError(404, message);
export const unauthorized = (message = "Unauthorized") => new HttpError(401, message);
export const conflict = (message, details) => new HttpError(409, message, details);
