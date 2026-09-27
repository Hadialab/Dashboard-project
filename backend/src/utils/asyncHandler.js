// Wraps an async route handler so a rejected promise reaches Express's error
// handler.
//
// Express 4 only catches synchronous throws. Every handler in this API is now
// async because the database is, and without this a failed query becomes an
// unhandled rejection: the client gets no response and the process exits,
// taking the whole API down with a single bad request.
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// Re-exported so a route file only needs one import for both the wrapper and
// the error helpers it throws.
export * from "./httpError.js";
